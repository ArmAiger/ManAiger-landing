const express = require("express");
const jwt = require("jsonwebtoken");
const createError = require("http-errors");
const { authenticate } = require("../middleware/auth");
const {
  getAuthUrl,
  getTokens,
  getChannelStats,
  getStoredChannelStats,
  getStoredLatestVideos,
  getHistoricalChannelStats,
  getAnalyticsComparison,
  getLatestVideos,
  getVideoMetricsLineChart,
} = require("../services/YouTubeService");
const { YouTubeChannel, User } = require("../db/sequelize");
const { google } = require("googleapis");
const { encrypt } = require("../utils/crypto");
const { auth: authConfig } = require("../config");

const router = express.Router();

// Import cache for debug endpoint - need to define this after the service import
let analyticsCache;
try {
  const { analyticsCache: cache } = require("../services/YouTubeService");
  analyticsCache = cache;
} catch (e) {
  console.warn("Could not import analyticsCache for debug endpoint");
}

// Debug endpoint to check YouTube configuration
router.get("/youtube/debug", authenticate, async (req, res) => {

  try {
    const { youtube: youtubeConfig } = require("../config");
    const channel = await YouTubeChannel.findOne({ 
      where: { user_id: req.user.id } 
    });

    const debugInfo = {
      timestamp: new Date().toISOString(),
      userId: req.user.id,
      config: {
        hasClientId: !!youtubeConfig.clientId,
        hasClientSecret: !!youtubeConfig.clientSecret,
        clientIdPreview: youtubeConfig.clientId ? `${youtubeConfig.clientId.substring(0, 10)}...` : null
      },
      channel: channel ? {
        hasChannel: true,
        channelId: channel.channelId,
        channelName: channel.channelName,
        hasAccessToken: !!channel.accessToken,
        hasRefreshToken: !!channel.refreshToken,
        tokenExpiresAt: channel.tokenExpiresAt,
        isTokenExpired: new Date() >= new Date(channel.tokenExpiresAt)
      } : {
        hasChannel: false
      },
      cache: analyticsCache ? {
        hasStatsCache: analyticsCache.has(`stats_${req.user.id}`),
        hasVideosCache: analyticsCache.has(`videos_${req.user.id}`)
      } : {
        cacheNotAvailable: true
      }
    };

    console.log(`[YouTube Debug] Debug info for user ${req.user.id}:`, debugInfo);
    res.json(debugInfo);
  } catch (e) {
    console.error(`[YouTube Debug] Error for user ${req.user.id}:`, e.message);
    res.status(500).json({ error: e.message });
  }
});

// 1. Get the auth URL for the frontend to redirect to
router.get("/youtube/auth/url", authenticate, (req, res) => {
  // We pass the user's JWT in the state parameter to securely identify them on callback
  const token = req.headers.authorization.split(" ")[1];
  const authUrl = getAuthUrl(token);
  res.json({ authUrl });
});

// 2. Handle the callback from Google
router.get("/youtube/auth/callback", async (req, res, next) => {
  try {
    const { code, state } = req.query;

    if (!state) {
      throw new Error("State parameter is missing from callback");
    }

    // The 'state' is the JWT we passed. Verify it to find the user.
    const decoded = jwt.verify(state, authConfig.jwtSecret);
    const user = await User.findByPk(decoded.sub);

    if (!user) {
      throw createError(401, "Invalid state token: User not found.");
    }

    const tokens = await getTokens(code);

    // Use the new tokens to get the user's channel info
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials(tokens);
    const youtube = google.youtube({ version: "v3", auth: oauth2Client });

    const response = await youtube.channels.list({
      mine: true,
      part: "id,snippet",
    });

    // Handle case where the user's Google account has no YouTube channel
    if (!response.data.items || response.data.items.length === 0) {
      throw createError(404, "No YouTube channel found for this Google account. Please create a channel on YouTube and try again.");
    }

    const channel = response.data.items[0];

    // Check if this specific YouTube channel is already linked to any account.
    const channelLink = await YouTubeChannel.findOne({ where: { channelId: channel.id } });

    if (channelLink) {
      // The channel is already linked in our system.
      if (channelLink.user_id !== user.id) {
        // It's linked to a DIFFERENT user. This is a conflict.
        throw createError(409, "This YouTube channel is already linked to another account in our system.");
      }

      // It's linked to the CURRENT user. This is a re-link. Update the tokens.
      const updateData = {
        channelId: channel.id,
        channelName: channel.snippet.title,
        accessToken: encrypt(tokens.access_token),
        tokenExpiresAt: new Date(tokens.expiry_date),
      };
      if (tokens.refresh_token) {
        updateData.refreshToken = encrypt(tokens.refresh_token);
      }
      await channelLink.update(updateData);
    } else {
      // This is a brand new link for this channel. A refresh token is required.
      if (!tokens.refresh_token) {
        throw createError(400, "A refresh token is required but was not provided. Please remove app access from your Google account settings and try linking again.");
      }
      await YouTubeChannel.create({
        user_id: user.id,
        channelId: channel.id,
        channelName: channel.snippet.title,
        accessToken: encrypt(tokens.access_token),
        refreshToken: encrypt(tokens.refresh_token),
        tokenExpiresAt: new Date(tokens.expiry_date),
      });
    }

    console.log(`[YouTube Callback] Successfully connected YouTube channel for user ${user.id}: ${channel.snippet.title}`);
    
    // Automatically fetch initial stats after successful connection
    try {
      console.log(`[YouTube Callback] Fetching initial stats for newly connected user ${user.id}`);
      await Promise.all([
        getChannelStats(user.id),
        getLatestVideos(user.id)
      ]);
      console.log(`[YouTube Callback] Successfully cached initial stats for user ${user.id}`);
    } catch (statsError) {
      // Don't fail the connection if stats fetching fails
      console.error(`[YouTube Callback] Failed to fetch initial stats for user ${user.id}:`, statsError.message);
    }

    res.redirect(`${process.env.CORS_ORIGIN}/analytics?youtube=connected`);
  } catch (e) {
    next(e);
  }
});

// 3. Get combined channel stats and latest videos
router.get("/youtube/stats", authenticate, async (req, res, next) => {
  console.log(`[YouTube Stats] Request from user: ${req.user.id}`);
  
  try {
    console.log(`[YouTube Stats] Fetching stats and videos for user: ${req.user.id}`);
    
    // Run requests in parallel for better performance
    const [stats, videos] = await Promise.all([
      getStoredChannelStats(req.user.id),
      getStoredLatestVideos(req.user.id),
    ]);

    console.log(`[YouTube Stats] Successfully retrieved stats:`, { 
      statsKeys: Object.keys(stats || {}), 
      videoCount: videos?.length || 0 
    });

    res.json({ stats, videos });
  } catch (e) {
    console.error(`[YouTube Stats] Error for user ${req.user.id}:`, {
      message: e.message,
      stack: e.stack,
      statusCode: e.statusCode || 500
    });
    next(e);
  }
});

// Manually refresh YouTube stats
router.post("/youtube/refresh-stats", authenticate, async (req, res, next) => {
  console.log(`[YouTube Refresh Stats] Request from user: ${req.user.id}`);
  
  try {
    console.log(`[YouTube Refresh Stats] Refreshing stats for user: ${req.user.id}`);
    
    // Force fetch new stats from API (bypassing cache)
    const [stats, videos] = await Promise.all([
      getChannelStats(req.user.id),
      getLatestVideos(req.user.id),
    ]);

    console.log(`[YouTube Refresh Stats] Successfully refreshed stats for user ${req.user.id}`);
    
    res.json({ 
      success: true,
      message: "Stats refreshed successfully",
      stats, 
      videos 
    });
  } catch (e) {
    console.error(`[YouTube Refresh Stats] Error for user ${req.user.id}:`, {
      message: e.message,
      stack: e.stack,
      statusCode: e.statusCode || 500
    });
    next(e);
  }
});

// Get analytics comparison data with trends
router.get("/youtube/analytics-comparison", authenticate, async (req, res, next) => {
  console.log(`[YouTube Analytics Comparison] Request from user: ${req.user.id}`);
  
  try {
    console.log(`[YouTube Analytics Comparison] Fetching comparison data for user: ${req.user.id}`);
    
    const comparison = await getAnalyticsComparison(req.user.id);
    
    console.log(`[YouTube Analytics Comparison] Successfully retrieved comparison data:`, {
      hasCurrentStats: !!comparison?.current,
      hasChanges: !!comparison?.changes,
      currentStatsKeys: Object.keys(comparison?.current || {}),
      changesKeys: Object.keys(comparison?.changes || {})
    });
    
    res.json(comparison);
  } catch (e) {
    console.error(`[YouTube Analytics Comparison] Error for user ${req.user.id}:`, {
      message: e.message,
      stack: e.stack,
      statusCode: e.statusCode || 500
    });
    next(e);
  }
});

// Get historical stats for charts
router.get("/youtube/historical-stats", authenticate, async (req, res, next) => {
  console.log(`[YouTube Historical Stats] Request from user: ${req.user.id}`);
  
  try {
    const period = req.query.period || 'month'; // 'week', 'month', 'quarter', 'year'
    console.log(`[YouTube Historical Stats] Fetching ${period} data for user: ${req.user.id}`);
    
    const historicalStats = await getHistoricalChannelStats(req.user.id, period);
    
    console.log(`[YouTube Historical Stats] Successfully retrieved historical data for user ${req.user.id}:`, {
      period,
      dataPoints: historicalStats.labels?.length || 0
    });
    
    res.json({ 
      historicalStats,
      period,
      generatedAt: new Date().toISOString()
    });
  } catch (e) {
    console.error(`[YouTube Historical Stats] Error for user ${req.user.id}:`, {
      message: e.message,
      stack: e.stack,
      statusCode: e.statusCode || 500
    });
    next(e);
  }
});

// Get video analytics trends (likes, comments, views per video)
router.get("/youtube/video-trends", authenticate, async (req, res, next) => {
  console.log(`[YouTube Video Trends] Request from user: ${req.user.id}`);
  
  try {
    const period = req.query.period || 'month';
    const videos = await getStoredLatestVideos(req.user.id);
    
    // Process videos to create trends data
    const videoTrends = {
      totalVideos: videos.length,
      averageViews: videos.reduce((sum, video) => sum + video.views, 0) / videos.length || 0,
      averageLikes: videos.reduce((sum, video) => sum + video.likes, 0) / videos.length || 0,
      averageComments: videos.reduce((sum, video) => sum + video.comments, 0) / videos.length || 0,
      recentVideos: videos.slice(0, 10).map(video => ({
        id: video.id,
        title: video.title,
        publishedAt: video.publishedAt,
        views: video.views,
        likes: video.likes,
        comments: video.comments,
        engagementRate: video.views > 0 ? ((video.likes + video.comments) / video.views) * 100 : 0
      })),
      trends: {
        views: videos.map((video, index) => ({
          videoIndex: index + 1,
          title: video.title.substring(0, 30) + (video.title.length > 30 ? '...' : ''),
          views: video.views
        })),
        engagement: videos.map((video, index) => ({
          videoIndex: index + 1,
          title: video.title.substring(0, 30) + (video.title.length > 30 ? '...' : ''),
          engagementRate: video.views > 0 ? ((video.likes + video.comments) / video.views) * 100 : 0
        }))
      }
    };
    
    console.log(`[YouTube Video Trends] Successfully calculated video trends for user ${req.user.id}:`, {
      totalVideos: videoTrends.totalVideos,
      avgViews: Math.round(videoTrends.averageViews),
      avgLikes: Math.round(videoTrends.averageLikes)
    });
    
    res.json(videoTrends);
  } catch (e) {
    console.error(`[YouTube Video Trends] Error for user ${req.user.id}:`, {
      message: e.message,
      stack: e.stack,
      statusCode: e.statusCode || 500
    });
    next(e);
  }
});

// 4. Get connected YouTube account info
router.get("/youtube/account", authenticate, async (req, res, next) => {
  console.log(`[YouTube Account] Request from user: ${req.user.id}`);
  
  try {
    const channel = await YouTubeChannel.findOne({ 
      where: { user_id: req.user.id } 
    });
    
    if (!channel) {
      console.log(`[YouTube Account] No YouTube account connected for user: ${req.user.id}`);
      return res.json({ connected: false });
    }
    
    console.log(`[YouTube Account] Found connected YouTube account for user ${req.user.id}: ${channel.channelName}`);
    
    res.json({
      connected: true,
      channelId: channel.channelId,
      channelName: channel.channelName,
      connectedAt: channel.createdAt,
      tokenExpiresAt: channel.tokenExpiresAt
    });
  } catch (e) {
    console.error(`[YouTube Account] Error for user ${req.user.id}:`, {
      message: e.message,
      stack: e.stack
    });
    next(e);
  }
});

// Get line chart data for video metrics (views, likes, comments) over time
router.get("/youtube/line-chart", authenticate, async (req, res, next) => {
  try {
    const { period = 'month', metric = 'all' } = req.query;
    
    // Validate period parameter
    const validPeriods = ['week', 'month', 'quarter', 'year'];
    if (!validPeriods.includes(period)) {
      throw createError(400, "Invalid period. Must be one of: week, month, quarter, year");
    }
    
    // Validate metric parameter
    const validMetrics = ['views', 'likes', 'comments', 'all'];
    if (!validMetrics.includes(metric)) {
      throw createError(400, "Invalid metric. Must be one of: views, likes, comments, all");
    }
    
    console.log(`[YouTube Route] Getting line chart data for user ${req.user.id}, period: ${period}, metric: ${metric}`);
    
    const chartData = await getVideoMetricsLineChart(req.user.id, period, metric);
    
    console.log(`[YouTube Route] Chart data structure:`, {
      hasChartData: !!chartData,
      hasChartDataProperty: !!(chartData && chartData.chartData),
      hasLabels: !!(chartData && chartData.chartData && chartData.chartData.labels),
      hasDatasets: !!(chartData && chartData.chartData && chartData.chartData.datasets),
      labelsLength: chartData && chartData.chartData && chartData.chartData.labels ? chartData.chartData.labels.length : 0,
      datasetsLength: chartData && chartData.chartData && chartData.chartData.datasets ? chartData.chartData.datasets.length : 0
    });
    
    res.json({
      success: true,
      data: chartData,
      meta: {
        userId: req.user.id,
        period,
        metric,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error(`[YouTube Route] Error getting line chart data for user ${req.user.id}:`, error.message);
    next(error);
  }
});

// 5. Disconnect YouTube account
router.delete("/youtube/disconnect", authenticate, async (req, res, next) => {
  try {
    const deleted = await YouTubeChannel.destroy({
      where: { user_id: req.user.id }
    });
    
    if (deleted === 0) {
      throw createError(404, "No YouTube account connected");
    }
    
    res.json({ message: "YouTube account disconnected successfully" });
  } catch (e) {
    next(e);
  }
});

module.exports = router;