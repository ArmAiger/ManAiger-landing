const { google } = require("googleapis");
const { youtube: youtubeConfig } = require("../config");
const { YouTubeChannel, YouTubeAnalytics, YouTubeVideoAnalytics } = require("../db/sequelize");
const { encrypt, decrypt } = require("../utils/crypto");
const { Op } = require("sequelize");

// In-memory cache for analytics (temporary solution until DB is properly configured)
const analyticsCache = new Map();
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

function createOAuth2Client() {
  return new google.auth.OAuth2(
    youtubeConfig.clientId,
    youtubeConfig.clientSecret,
    `${process.env.APP_URL}/api/youtube/auth/callback` // Redirect URI
  );
}

function getAuthUrl(state) {
  const oauth2Client = createOAuth2Client();
  const scopes = [
    "https://www.googleapis.com/auth/youtube.readonly",
    "https://www.googleapis.com/auth/userinfo.profile", // To get user's channel
  ];

  return oauth2Client.generateAuthUrl({
    access_type: "offline", // Required to get a refresh token
    scope: scopes,
    prompt: "consent", // Force the consent screen to appear, ensuring a refresh token is sent.
    state: state, // Pass the state (JWT) to the callback
  });
}

async function getTokens(code) {
  const oauth2Client = createOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

/**
 * Creates an authenticated YouTube API client for a user.
 * Handles token decryption and refreshing automatically.
 * @param {string} userId The user's ID
 * @returns {Promise<{youtube: object, channelId: string}>} An object containing the authenticated youtube client and the user's channel ID.
 */
async function getAuthenticatedClient(userId) {
  const channel = await YouTubeChannel.findOne({ where: { user_id: userId } });
  if (!channel) {
    console.error(`[YouTube Service] No YouTube channel found for user: ${userId}`);
    const error = new Error("YouTube channel not linked for this user.");
    error.statusCode = 404;
    throw error;
  }
  const oauth2Client = createOAuth2Client();
  
  try {
    oauth2Client.setCredentials({
      access_token: decrypt(channel.accessToken),
      refresh_token: decrypt(channel.refreshToken),
      expiry_date: channel.tokenExpiresAt.getTime(),
    });
  } catch (decryptError) {
    console.error(`[YouTube Service] Failed to decrypt tokens for user ${userId}:`, decryptError.message);
    throw new Error("Failed to decrypt YouTube tokens. Please reconnect your account.");
  }

  // Check if token needs refresh
  if (new Date() >= new Date(channel.tokenExpiresAt)) {
    try {
      const { credentials } = await oauth2Client.refreshAccessToken();
      oauth2Client.setCredentials(credentials);

      // Update the stored tokens
      await channel.update({
        accessToken: encrypt(credentials.access_token),
        refreshToken: encrypt(credentials.refresh_token || channel.refreshToken),
        tokenExpiresAt: new Date(credentials.expiry_date),
      });
      console.log(`[YouTube Service] Successfully refreshed token for user ${userId}`);
    } catch (error) {
      console.error(`[YouTube Service] Failed to refresh YouTube token for user ${userId}:`, error.message);
      throw new Error("YouTube token refresh failed. Please reconnect your account.");
    }
  }

  const youtube = google.youtube({ version: "v3", auth: oauth2Client });
  return { youtube, channelId: channel.channelId };
}

/**
 * Fetches the latest channel statistics from YouTube API and caches them.
 * @param {string} userId The user's ID.
 */
async function getChannelStats(userId) {
  console.log(`[YouTube Service] Fetching channel stats from API for user: ${userId}`);
  
  try {
    const { youtube, channelId } = await getAuthenticatedClient(userId);
    console.log(`[YouTube Service] Making API call to get channel stats for channel: ${channelId}`);

    const response = await youtube.channels.list({
      id: [channelId],
      part: "snippet,statistics",
    });

    console.log(`[YouTube Service] API response received for user ${userId}:`, {
      itemsCount: response.data.items?.length,
      channelId: response.data.items?.[0]?.id
    });

    if (!response.data.items || response.data.items.length === 0) {
      console.error(`[YouTube Service] No channel data returned for user ${userId}, channel ${channelId}`);
      throw new Error("Channel not found or access denied");
    }

    const channelData = response.data.items[0];
    const stats = channelData.statistics;
    
    if (!stats) {
      console.error(`[YouTube Service] No statistics data in API response for user ${userId}`);
      throw new Error("Channel statistics not available");
    }
    
    const channelStats = {
      subscriberCount: parseInt(stats.subscriberCount || 0),
      viewCount: parseInt(stats.viewCount || 0),
      videoCount: parseInt(stats.videoCount || 0),
    };

    console.log(`[YouTube Service] Parsed channel stats for user ${userId}:`, channelStats);

    // Cache the stats with timestamp
    analyticsCache.set(`stats_${userId}`, {
      data: channelStats,
      timestamp: Date.now()
    });

    console.log(`[YouTube Service] Cached stats for user ${userId}`);
    
    // Store stats in database for historical tracking
    await storeAnalyticsData(userId, channelStats);
    
    return channelStats;
  } catch (error) {
    console.error(`[YouTube Service] Error fetching channel stats for user ${userId}:`, {
      message: error.message,
      stack: error.stack,
      statusCode: error.statusCode,
      code: error.code,
      errors: error.errors
    });
    
    // Handle specific YouTube API errors
    if (error.code === 403) {
      if (error.message.includes('quotaExceeded')) {
        throw new Error('YouTube API quota exceeded. Please try again later.');
      } else if (error.message.includes('forbidden')) {
        throw new Error('Access to YouTube channel is forbidden. Please reconnect your account.');
      }
    } else if (error.code === 401) {
      throw new Error('YouTube authentication failed. Please reconnect your account.');
    } else if (error.code === 404) {
      throw new Error('YouTube channel not found.');
    }
    
    throw error;
  }
}

/**
 * Gets the latest stored channel statistics from cache, or fetches from API if none exist.
 * @param {string} userId The user's ID.
 */
async function getStoredChannelStats(userId) {
  console.log(`[YouTube Service] Getting stored channel stats for user: ${userId}`);
  
  const cacheKey = `stats_${userId}`;
  const cached = analyticsCache.get(cacheKey);
  
  // Check if we have cached data that's less than 1 hour old
  if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
    console.log(`[YouTube Service] Returning cached stats for user ${userId} (age: ${Math.round((Date.now() - cached.timestamp) / 1000)}s)`);
    return cached.data;
  }

  console.log(`[YouTube Service] No cached data or stale cache for user ${userId}, fetching from API`);
  // If no cached data or it's stale, fetch from API
  return await getChannelStats(userId);
}

/**
 * Store analytics data in database for historical tracking
 * @param {string} userId The user's ID
 * @param {object} stats The channel stats to store
 */
async function storeAnalyticsData(userId, stats) {
  try {
    // Check if we already have data for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const existingToday = await YouTubeAnalytics.findOne({
      where: {
        userId: userId,
        recordedAt: {
          [Op.gte]: today,
          [Op.lt]: tomorrow
        }
      }
    });

    if (existingToday) {
      // Update existing record for today
      await existingToday.update({
        subscriberCount: stats.subscriberCount,
        viewCount: stats.viewCount,
        videoCount: stats.videoCount,
        recordedAt: new Date()
      });
      console.log(`[YouTube Service] Updated today's analytics record for user ${userId}`);
    } else {
      // Create new record for today
      await YouTubeAnalytics.create({
        userId: userId,
        subscriberCount: stats.subscriberCount,
        viewCount: stats.viewCount,
        videoCount: stats.videoCount,
        recordedAt: new Date()
      });
      console.log(`[YouTube Service] Created new analytics record for user ${userId}`);
    }
  } catch (error) {
    console.error(`[YouTube Service] Error storing analytics data for user ${userId}:`, error.message);
    // Don't throw error, just log it - we don't want to fail the main operation
  }
}

/**
 * Gets historical channel statistics from database for charts and trends.
 * @param {string} userId The user's ID.
 * @param {string} period The time period: 'week', 'month', 'quarter', 'year'
 */
async function getHistoricalChannelStats(userId, period = 'month') {
  console.log(`[YouTube Service] Getting historical stats for user ${userId}, period: ${period}`);
  
  try {
    const currentDate = new Date();
    let startDate, groupBy, dateFormat;

    switch (period) {
      case 'week':
        startDate = new Date(currentDate.getTime() - 7 * 24 * 60 * 60 * 1000);
        groupBy = 'day';
        dateFormat = '%Y-%m-%d';
        break;
      case 'month':
        startDate = new Date(currentDate.getTime() - 30 * 24 * 60 * 60 * 1000);
        groupBy = 'day';
        dateFormat = '%Y-%m-%d';
        break;
      case 'quarter':
        startDate = new Date(currentDate.getTime() - 90 * 24 * 60 * 60 * 1000);
        groupBy = 'week';
        dateFormat = '%Y-%u';
        break;
      case 'year':
        startDate = new Date(currentDate.getTime() - 365 * 24 * 60 * 60 * 1000);
        groupBy = 'month';
        dateFormat = '%Y-%m';
        break;
      default:
        startDate = new Date(currentDate.getTime() - 30 * 24 * 60 * 60 * 1000);
        groupBy = 'day';
        dateFormat = '%Y-%m-%d';
    }

    const historicalData = await YouTubeAnalytics.findAll({
      where: {
        userId: userId,
        recordedAt: {
          [Op.gte]: startDate,
          [Op.lte]: currentDate
        }
      },
      order: [['recordedAt', 'ASC']],
      raw: true
    });

    console.log(`[YouTube Service] Found ${historicalData.length} historical records for user ${userId}`);

    if (historicalData.length === 0) {
      // If no historical data, create mock data based on current stats
      console.log(`[YouTube Service] No historical data found, generating sample data for user ${userId}`);
      const currentStats = await getStoredChannelStats(userId);
      return generateSampleHistoricalData(currentStats, period);
    }

    // Process the data for chart consumption
    const chartData = {
      labels: [],
      datasets: {
        subscribers: [],
        views: [],
        videos: []
      }
    };

    historicalData.forEach(record => {
      const date = new Date(record.recordedAt);
      let label;
      
      switch (period) {
        case 'week':
        case 'month':
          label = date.toISOString().split('T')[0]; // YYYY-MM-DD
          break;
        case 'quarter':
          const weekNum = getWeekNumber(date);
          label = `${date.getFullYear()}-W${weekNum}`;
          break;
        case 'year':
          label = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
        default:
          label = date.toISOString().split('T')[0];
      }

      chartData.labels.push(label);
      chartData.datasets.subscribers.push({
        x: label,
        y: parseInt(record.subscriberCount)
      });
      chartData.datasets.views.push({
        x: label,
        y: parseInt(record.viewCount)
      });
      chartData.datasets.videos.push({
        x: label,
        y: parseInt(record.videoCount)
      });
    });

    return chartData;
  } catch (error) {
    console.error(`[YouTube Service] Error getting historical stats for user ${userId}:`, error.message);
    
    // Fallback to sample data if database query fails
    const currentStats = await getStoredChannelStats(userId);
    return generateSampleHistoricalData(currentStats, period);
  }
}

/**
 * Generate sample historical data when no real data exists
 */
function generateSampleHistoricalData(currentStats, period) {
  const chartData = {
    labels: [],
    datasets: {
      subscribers: [],
      views: [],
      videos: []
    }
  };

  let days;
  switch (period) {
    case 'week': days = 7; break;
    case 'month': days = 30; break;
    case 'quarter': days = 90; break;
    case 'year': days = 365; break;
    default: days = 30;
  }

  for (let i = days; i >= 0; i--) {
    const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const label = date.toISOString().split('T')[0];
    
    // Generate realistic progression (slight growth over time)
    const growthFactor = (days - i) / days; // 0 to 1
    const variance = 0.05 * (Math.random() - 0.5); // ±2.5% variance
    
    const subscribers = Math.max(0, Math.floor(
      currentStats.subscriberCount * (0.85 + growthFactor * 0.15) * (1 + variance)
    ));
    const views = Math.max(0, Math.floor(
      currentStats.viewCount * (0.85 + growthFactor * 0.15) * (1 + variance)
    ));
    const videos = Math.max(0, Math.floor(
      currentStats.videoCount * (0.9 + growthFactor * 0.1) * (1 + variance)
    ));

    chartData.labels.push(label);
    chartData.datasets.subscribers.push({ x: label, y: subscribers });
    chartData.datasets.views.push({ x: label, y: views });
    chartData.datasets.videos.push({ x: label, y: videos });
  }

  return chartData;
}

/**
 * Get week number of the year
 */
function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

/**
 * Fetches the last 10 videos for the user's linked channel and caches them.
 * @param {string} userId The user's ID.
 */
async function getLatestVideos(userId) {
  console.log(`[YouTube Service] Fetching latest videos from API for user: ${userId}`);
  
  try {
    const { youtube, channelId } = await getAuthenticatedClient(userId);
    console.log(`[YouTube Service] Making API call to search videos for channel: ${channelId}`);

    // Step 1: Find the IDs of the last 10 videos. This is a lightweight call.
    const searchResponse = await youtube.search.list({
      channelId: channelId,
      part: "id", // We only need the video IDs from the search
      order: "date",
      maxResults: 10,
      type: "video",
    });

    console.log(`[YouTube Service] Search API response for user ${userId}:`, {
      itemsCount: searchResponse.data.items?.length
    });

    const videoIds = searchResponse.data.items.map((item) => item.id.videoId);

    if (videoIds.length === 0) {
      console.log(`[YouTube Service] No videos found for user ${userId}`);
      return [];
    }

    console.log(`[YouTube Service] Found ${videoIds.length} videos for user ${userId}, fetching details`);

    // Step 2: Get detailed statistics for all 10 videos in a single, efficient API call.
    const videosResponse = await youtube.videos.list({
      id: videoIds,
      part: "snippet,statistics",
    });

    console.log(`[YouTube Service] Videos details API response for user ${userId}:`, {
      itemsCount: videosResponse.data.items?.length
    });

    const videos = videosResponse.data.items.map((item) => ({
      id: item.id,
      title: item.snippet.title,
      publishedAt: item.snippet.publishedAt,
      views: parseInt(item.statistics.viewCount || 0),
      likes: parseInt(item.statistics.likeCount || 0),
      comments: parseInt(item.statistics.commentCount || 0),
    }));

    console.log(`[YouTube Service] Processed ${videos.length} videos for user ${userId}`);

    // Cache the videos with timestamp
    analyticsCache.set(`videos_${userId}`, {
      data: videos,
      timestamp: Date.now()
    });

    console.log(`[YouTube Service] Cached videos for user ${userId}`);
    
    // Store video analytics in database for historical tracking
    await storeVideoAnalyticsData(userId, videos);
    
    return videos;
  } catch (error) {
    console.error(`[YouTube Service] Error fetching latest videos for user ${userId}:`, {
      message: error.message,
      stack: error.stack,
      statusCode: error.statusCode,
      code: error.code,
      errors: error.errors
    });
    
    // Handle specific YouTube API errors
    if (error.code === 403) {
      if (error.message.includes('quotaExceeded')) {
        throw new Error('YouTube API quota exceeded. Please try again later.');
      } else if (error.message.includes('forbidden')) {
        throw new Error('Access to YouTube videos is forbidden. Please reconnect your account.');
      }
    } else if (error.code === 401) {
      throw new Error('YouTube authentication failed. Please reconnect your account.');
    }
    
    throw error;
  }
}

/**
 * Gets the latest stored video analytics from cache, or fetches from API if none exist.
 * @param {string} userId The user's ID.
 */
async function getStoredLatestVideos(userId) {
  console.log(`[YouTube Service] Getting stored latest videos for user: ${userId}`);
  
  const cacheKey = `videos_${userId}`;
  const cached = analyticsCache.get(cacheKey);
  
  // Check if we have cached data that's less than 1 hour old
  if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
    console.log(`[YouTube Service] Returning cached videos for user ${userId} (age: ${Math.round((Date.now() - cached.timestamp) / 1000)}s)`);
    return cached.data;
  }

  console.log(`[YouTube Service] No cached videos or stale cache for user ${userId}, fetching from API`);
  // If no cached data or it's stale, fetch from API
  return await getLatestVideos(userId);
}

/**
 * Gets analytics comparison data for showing trends using real historical data.
 * @param {string} userId The user's ID.
 */
async function getAnalyticsComparison(userId) {
  console.log(`[YouTube Service] Getting analytics comparison for user: ${userId}`);
  
  try {
    // Get current stats
    const currentStats = await getStoredChannelStats(userId);
    console.log(`[YouTube Service] Got current stats for comparison for user ${userId}:`, currentStats);

    // Get historical data from database
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);
    lastWeek.setHours(0, 0, 0, 0);

    const lastMonth = new Date();
    lastMonth.setDate(lastMonth.getDate() - 30);
    lastMonth.setHours(0, 0, 0, 0);

    // Try to get actual historical data
    const [yesterdayStats, lastWeekStats, lastMonthStats] = await Promise.all([
      getHistoricalStatsForDate(userId, yesterday),
      getHistoricalStatsForDate(userId, lastWeek),
      getHistoricalStatsForDate(userId, lastMonth)
    ]);

    console.log(`[YouTube Service] Historical data found:`, {
      yesterday: !!yesterdayStats,
      lastWeek: !!lastWeekStats,
      lastMonth: !!lastMonthStats
    });

    // Use actual data if available, otherwise estimate based on reasonable assumptions
    const yesterdayData = yesterdayStats || estimateHistoricalStats(currentStats, 1);
    const weekData = lastWeekStats || estimateHistoricalStats(currentStats, 7);
    const monthData = lastMonthStats || estimateHistoricalStats(currentStats, 30);

    const comparison = {
      current: currentStats,
      changes: {
        subscribers: {
          daily: currentStats.subscriberCount - yesterdayData.subscriberCount,
          dailyPercentage: yesterdayData.subscriberCount > 0 
            ? ((currentStats.subscriberCount - yesterdayData.subscriberCount) / yesterdayData.subscriberCount) * 100 
            : 0,
          weekly: currentStats.subscriberCount - weekData.subscriberCount,
          weeklyPercentage: weekData.subscriberCount > 0 
            ? ((currentStats.subscriberCount - weekData.subscriberCount) / weekData.subscriberCount) * 100 
            : 0,
          monthly: currentStats.subscriberCount - monthData.subscriberCount,
          monthlyPercentage: monthData.subscriberCount > 0 
            ? ((currentStats.subscriberCount - monthData.subscriberCount) / monthData.subscriberCount) * 100 
            : 0,
        },
        views: {
          daily: currentStats.viewCount - yesterdayData.viewCount,
          dailyPercentage: yesterdayData.viewCount > 0 
            ? ((currentStats.viewCount - yesterdayData.viewCount) / yesterdayData.viewCount) * 100 
            : 0,
          weekly: currentStats.viewCount - weekData.viewCount,
          weeklyPercentage: weekData.viewCount > 0 
            ? ((currentStats.viewCount - weekData.viewCount) / weekData.viewCount) * 100 
            : 0,
          monthly: currentStats.viewCount - monthData.viewCount,
          monthlyPercentage: monthData.viewCount > 0 
            ? ((currentStats.viewCount - monthData.viewCount) / monthData.viewCount) * 100 
            : 0,
        },
        videos: {
          daily: currentStats.videoCount - yesterdayData.videoCount,
          weekly: currentStats.videoCount - weekData.videoCount,
          monthly: currentStats.videoCount - monthData.videoCount,
        }
      },
      dataSource: {
        yesterday: yesterdayStats ? 'actual' : 'estimated',
        week: lastWeekStats ? 'actual' : 'estimated',
        month: lastMonthStats ? 'actual' : 'estimated'
      }
    };

    console.log(`[YouTube Service] Generated analytics comparison for user ${userId}:`, {
      subscribersDaily: comparison.changes.subscribers.daily,
      subscribersWeekly: comparison.changes.subscribers.weekly,
      subscribersMonthly: comparison.changes.subscribers.monthly,
      viewsDaily: comparison.changes.views.daily,
      viewsWeekly: comparison.changes.views.weekly,
      viewsMonthly: comparison.changes.views.monthly
    });

    return comparison;
  } catch (error) {
    console.error(`[YouTube Service] Error getting analytics comparison for user ${userId}:`, {
      message: error.message,
      stack: error.stack,
      statusCode: error.statusCode
    });
    throw error;
  }
}

/**
 * Get historical stats for a specific date
 */
async function getHistoricalStatsForDate(userId, targetDate) {
  try {
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const record = await YouTubeAnalytics.findOne({
      where: {
        userId: userId,
        recordedAt: {
          [Op.gte]: targetDate,
          [Op.lt]: nextDay
        }
      },
      order: [['recordedAt', 'DESC']],
      raw: true
    });

    return record ? {
      subscriberCount: parseInt(record.subscriberCount),
      viewCount: parseInt(record.viewCount),
      videoCount: parseInt(record.videoCount)
    } : null;
  } catch (error) {
    console.error(`[YouTube Service] Error getting historical stats for date:`, error.message);
    return null;
  }
}

/**
 * Estimate historical stats based on typical YouTube channel growth patterns
 */
function estimateHistoricalStats(currentStats, daysAgo) {
  // Estimate based on typical YouTube growth patterns
  // Small channels: ~0.5-2% growth per month
  // Medium channels: ~0.2-1% growth per month  
  // Large channels: ~0.1-0.5% growth per month
  
  const subscriberCount = currentStats.subscriberCount;
  let monthlyGrowthRate;
  
  if (subscriberCount < 1000) {
    monthlyGrowthRate = 0.015; // 1.5% monthly
  } else if (subscriberCount < 100000) {
    monthlyGrowthRate = 0.008; // 0.8% monthly
  } else {
    monthlyGrowthRate = 0.003; // 0.3% monthly
  }
  
  const dailyGrowthRate = monthlyGrowthRate / 30;
  const growthFactor = Math.pow(1 + dailyGrowthRate, -daysAgo);
  
  return {
    subscriberCount: Math.max(0, Math.floor(currentStats.subscriberCount * growthFactor)),
    viewCount: Math.max(0, Math.floor(currentStats.viewCount * growthFactor * 0.98)), // Views grow slightly slower
    videoCount: Math.max(0, Math.floor(currentStats.videoCount * (1 - daysAgo * 0.002))) // Videos added over time
  };
}

/**
 * Store video analytics data in database for historical tracking
 * @param {string} userId The user's ID
 * @param {array} videos The video analytics to store
 */
async function storeVideoAnalyticsData(userId, videos) {
  try {
    console.log(`[YouTube Service] Storing video analytics for user ${userId}, ${videos.length} videos`);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    for (const video of videos) {
      // Check if we already have analytics for this video today
      const existing = await YouTubeVideoAnalytics.findOne({
        where: {
          userId: userId,
          videoId: video.id,
          recordedAt: {
            [Op.gte]: today,
            [Op.lt]: tomorrow
          }
        }
      });

      if (existing) {
        // Update existing record
        await existing.update({
          title: video.title,
          publishedAt: new Date(video.publishedAt),
          views: video.views,
          likes: video.likes,
          comments: video.comments,
          recordedAt: new Date()
        });
      } else {
        // Create new record
        await YouTubeVideoAnalytics.create({
          userId: userId,
          videoId: video.id,
          title: video.title,
          publishedAt: new Date(video.publishedAt),
          views: video.views,
          likes: video.likes,
          comments: video.comments,
          recordedAt: new Date()
        });
      }
    }
    
    console.log(`[YouTube Service] Successfully stored video analytics for user ${userId}`);
  } catch (error) {
    console.error(`[YouTube Service] Error storing video analytics for user ${userId}:`, error.message);
    // Don't throw error, just log it
  }
}

/**
 * Get line chart data for views, likes, comments over time
 * @param {string} userId The user's ID
 * @param {string} period The time period: 'week', 'month', 'quarter', 'year'
 * @param {string} metric The metric to focus on: 'views', 'likes', 'comments', 'all'
 */
async function getVideoMetricsLineChart(userId, period = 'month', metric = 'all') {
  console.log(`[YouTube Service] Getting line chart data for user ${userId}, period: ${period}, metric: ${metric}`);
  
  try {
    const currentDate = new Date();
    let startDate;

    switch (period) {
      case 'week':
        startDate = new Date(currentDate.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(currentDate.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'quarter':
        startDate = new Date(currentDate.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        startDate = new Date(currentDate.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(currentDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Get aggregated video analytics data
    const videoAnalytics = await YouTubeVideoAnalytics.findAll({
      where: {
        userId: userId,
        recordedAt: {
          [Op.gte]: startDate,
          [Op.lte]: currentDate
        }
      },
      order: [['recordedAt', 'ASC']],
      raw: true
    });

    console.log(`[YouTube Service] Found ${videoAnalytics.length} video analytics records for user ${userId}`);

    if (videoAnalytics.length === 0) {
      // Generate sample line chart data if no historical data exists
      return await generateSampleLineChartData(userId, period, metric);
    }

    // If we have very limited data points (less than 3 days), also generate sample data
    const uniqueDates = [...new Set(videoAnalytics.map(record => 
      new Date(record.recordedAt).toISOString().split('T')[0]
    ))];
    
    if (uniqueDates.length < 3) {
      console.log(`[YouTube Service] Only ${uniqueDates.length} unique dates found, generating enhanced sample data`);
      return await generateSampleLineChartData(userId, period, metric);
    }

    // Group data by date and aggregate metrics
    const groupedData = {};
    
    videoAnalytics.forEach(record => {
      const date = new Date(record.recordedAt).toISOString().split('T')[0];
      
      if (!groupedData[date]) {
        groupedData[date] = {
          totalViews: 0,
          totalLikes: 0,
          totalComments: 0,
          videoCount: 0
        };
      }
      
      groupedData[date].totalViews += parseInt(record.views || 0);
      groupedData[date].totalLikes += parseInt(record.likes || 0);
      groupedData[date].totalComments += parseInt(record.comments || 0);
      groupedData[date].videoCount += 1;
    });
    
    // Calculate engagement rates
    Object.keys(groupedData).forEach(date => {
      const data = groupedData[date];
      data.engagementRate = data.totalViews > 0 
        ? ((data.totalLikes + data.totalComments) / data.totalViews) * 100 
        : 0;
    });
    
    const chartData = {
      labels: Object.keys(groupedData).sort(),
      datasets: []
    };

    if (metric === 'all' || metric === 'views') {
      chartData.datasets.push({
        label: 'Total Views',
        data: chartData.labels.map(label => ({
          x: label,
          y: groupedData[label].totalViews
        })),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4
      });
    }

    if (metric === 'all' || metric === 'likes') {
      chartData.datasets.push({
        label: 'Total Likes',
        data: chartData.labels.map(label => ({
          x: label,
          y: groupedData[label].totalLikes
        })),
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        tension: 0.4
      });
    }

    if (metric === 'all' || metric === 'comments') {
      chartData.datasets.push({
        label: 'Total Comments',
        data: chartData.labels.map(label => ({
          x: label,
          y: groupedData[label].totalComments
        })),
        borderColor: 'rgb(168, 85, 247)',
        backgroundColor: 'rgba(168, 85, 247, 0.1)',
        tension: 0.4
      });
    }

    // Add engagement rate if showing all metrics
    if (metric === 'all') {
      chartData.datasets.push({
        label: 'Engagement Rate (%)',
        data: chartData.labels.map(label => ({
          x: label,
          y: groupedData[label].engagementRate
        })),
        borderColor: 'rgb(245, 158, 11)',
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        tension: 0.4,
        yAxisID: 'percentage'
      });
    }

    return {
      chartData,
      period,
      metric,
      totalDataPoints: videoAnalytics.length,
      dataSource: 'actual',
      dateRange: {
        start: startDate.toISOString(),
        end: currentDate.toISOString()
      }
    };
  } catch (error) {
    console.error(`[YouTube Service] Error getting line chart data for user ${userId}:`, error.message);
    throw error;
  }
}

/**
 * Generate sample line chart data when no historical data exists
 */
async function generateSampleLineChartData(userId, period, metric) {
  console.log(`[YouTube Service] Generating sample line chart data for user ${userId}`);
  
  try {
    const currentVideos = await getStoredLatestVideos(userId);
    console.log(`[YouTube Service] Current videos for sample data:`, currentVideos.length);
    
    let days;
    switch (period) {
      case 'week': days = 7; break;
      case 'month': days = 30; break;
      case 'quarter': days = 90; break;
      case 'year': days = 365; break;
      default: days = 30;
    }

    const chartData = {
      labels: [],
      datasets: []
    };

    // Generate dates (more frequent data points for better visualization)
    const dataPoints = Math.min(days + 1, period === 'week' ? 8 : period === 'month' ? 15 : period === 'quarter' ? 20 : 25);
    for (let i = dataPoints - 1; i >= 0; i--) {
      const date = new Date(Date.now() - i * Math.floor(days / (dataPoints - 1)) * 24 * 60 * 60 * 1000);
      chartData.labels.push(date.toISOString().split('T')[0]);
    }
    
    console.log(`[YouTube Service] Generated ${chartData.labels.length} labels for sample data`);

    // Calculate base metrics from current videos (with fallback values)
    const totalViews = currentVideos.length > 0 ? currentVideos.reduce((sum, video) => sum + (video.views || 0), 0) : 10000;
    const totalLikes = currentVideos.length > 0 ? currentVideos.reduce((sum, video) => sum + (video.likes || 0), 0) : 500;
    const totalComments = currentVideos.length > 0 ? currentVideos.reduce((sum, video) => sum + (video.comments || 0), 0) : 100;
    
    console.log(`[YouTube Service] Base metrics for sample data:`, { totalViews, totalLikes, totalComments });

    if (metric === 'all' || metric === 'views') {
      const viewsData = chartData.labels.map((label, index) => {
        // Create more realistic growth pattern - starts lower and grows
        const progressFactor = index / (chartData.labels.length - 1); // 0 to 1
        const baseValue = totalViews * 0.3; // Start at 30% of current total
        const growth = totalViews * 0.7 * progressFactor; // Grow to 70% more
        const variance = totalViews * 0.1 * (Math.random() - 0.5); // ±10% variance
        return {
          x: label,
          y: Math.max(0, Math.floor(baseValue + growth + variance))
        };
      });

      chartData.datasets.push({
        label: 'Total Views',
        data: viewsData,
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4
      });
    }

    if (metric === 'all' || metric === 'likes') {
      const likesData = chartData.labels.map((label, index) => {
        const progressFactor = index / (chartData.labels.length - 1);
        const baseValue = totalLikes * 0.4;
        const growth = totalLikes * 0.6 * progressFactor;
        const variance = totalLikes * 0.15 * (Math.random() - 0.5);
        return {
          x: label,
          y: Math.max(0, Math.floor(baseValue + growth + variance))
        };
      });

      chartData.datasets.push({
        label: 'Total Likes',
        data: likesData,
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        tension: 0.4
      });
    }

    if (metric === 'all' || metric === 'comments') {
      const commentsData = chartData.labels.map((label, index) => {
        const progressFactor = index / (chartData.labels.length - 1);
        const baseValue = totalComments * 0.3;
        const growth = totalComments * 0.7 * progressFactor;
        const variance = totalComments * 0.2 * (Math.random() - 0.5);
        return {
          x: label,
          y: Math.max(0, Math.floor(baseValue + growth + variance))
        };
      });

      chartData.datasets.push({
        label: 'Total Comments',
        data: commentsData,
        borderColor: 'rgb(168, 85, 247)',
        backgroundColor: 'rgba(168, 85, 247, 0.1)',
        tension: 0.4
      });
    }

    if (metric === 'all') {
      // Add engagement rate with more realistic progression
      const engagementData = chartData.labels.map((label, index) => {
        const baseRate = totalViews > 0 ? ((totalLikes + totalComments) / totalViews) * 100 : 3.5;
        const progressFactor = index / (chartData.labels.length - 1);
        // Engagement rate might decrease slightly over time as total views grow faster
        const trend = -0.5 * progressFactor; 
        const variance = 0.4 * (Math.random() - 0.5);
        return {
          x: label,
          y: Math.max(0.5, baseRate + trend + variance) // Minimum 0.5% engagement
        };
      });

      chartData.datasets.push({
        label: 'Engagement Rate (%)',
        data: engagementData,
        borderColor: 'rgb(245, 158, 11)',
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        tension: 0.4,
        yAxisID: 'percentage'
      });
    }

    console.log(`[YouTube Service] Sample chart data final structure:`, {
      hasChartData: !!chartData,
      hasLabels: !!chartData.labels,
      labelsLength: chartData.labels ? chartData.labels.length : 0,
      hasDatasets: !!chartData.datasets,
      datasetsLength: chartData.datasets ? chartData.datasets.length : 0,
      datasetLabels: chartData.datasets ? chartData.datasets.map(d => d.label) : []
    });

    return {
      chartData,
      period,
      metric,
      totalDataPoints: chartData.labels.length,
      dataSource: 'sample',
      dateRange: {
        start: chartData.labels[0],
        end: chartData.labels[chartData.labels.length - 1]
      }
    };
  } catch (error) {
    console.error(`[YouTube Service] Error generating sample line chart data:`, error.message);
    throw error;
  }
}

module.exports = { 
  getAuthUrl, 
  getTokens, 
  getChannelStats,
  getStoredChannelStats,
  getHistoricalChannelStats,
  getLatestVideos,
  getStoredLatestVideos,
  getAnalyticsComparison,
  storeVideoAnalyticsData,
  getVideoMetricsLineChart,
  generateSampleLineChartData,
  analyticsCache // Export cache for debugging
};
