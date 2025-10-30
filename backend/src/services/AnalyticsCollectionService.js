const { User, YouTubeChannel, TwitchChannel, AnalyticsSnapshot, SystemEvent } = require('../db/sequelize');
const { getChannelStats: getYouTubeStats, getLatestVideos } = require('./YouTubeService');
const { getChannelStats: getTwitchStats } = require('./TwitchService');
const { decrypt } = require('../utils/crypto');

async function collectUserAnalytics(user) {
  const analytics = {
    userId: user.id,
    timestamp: new Date(),
    platforms: {},
    summary: {
      totalFollowers: 0,
      totalViews: 0,
      totalVideos: 0,
      connectedPlatforms: []
    }
  };

  // Collect YouTube data if connected
  try {
    const youtubeChannel = await YouTubeChannel.findOne({ where: { user_id: user.id } });
    if (youtubeChannel) {
      console.log(`Collecting YouTube data for user ${user.id}`);
      
      const [channelStats, latestVideos] = await Promise.all([
        getYouTubeStats(user.id),
        getLatestVideos(user.id).catch(() => []) // Don't fail if videos can't be fetched
      ]);

      analytics.platforms.youtube = {
        channelId: youtubeChannel.channelId,
        channelName: youtubeChannel.channelName,
        subscriberCount: parseInt(channelStats.subscriberCount) || 0,
        viewCount: parseInt(channelStats.viewCount) || 0,
        videoCount: parseInt(channelStats.videoCount) || 0,
        latestVideos: latestVideos.slice(0, 5).map(video => ({
          id: video.id,
          title: video.title,
          publishedAt: video.publishedAt,
          views: parseInt(video.views) || 0,
          likes: parseInt(video.likes) || 0,
          comments: parseInt(video.comments) || 0
        })),
        collectedAt: new Date()
      };

      analytics.summary.totalFollowers += analytics.platforms.youtube.subscriberCount;
      analytics.summary.totalViews += analytics.platforms.youtube.viewCount;
      analytics.summary.totalVideos += analytics.platforms.youtube.videoCount;
      analytics.summary.connectedPlatforms.push('youtube');
    }
  } catch (error) {
    console.error(`Error collecting YouTube data for user ${user.id}:`, error.message);
    analytics.platforms.youtube = { error: error.message, collectedAt: new Date() };
  }

  // Collect Twitch data if connected
  try {
    const twitchChannel = await TwitchChannel.findOne({ where: { user_id: user.id } });
    if (twitchChannel) {
      console.log(`Collecting Twitch data for user ${user.id}`);
      
      const twitchStats = await getTwitchStats(user.id);

      analytics.platforms.twitch = {
        channelId: twitchChannel.channelId,
        channelName: twitchChannel.channelName,
        followers: twitchStats.followers || 0,
        isLive: !!twitchStats.stream,
        currentStream: twitchStats.stream ? {
          title: twitchStats.stream.title,
          gameName: twitchStats.stream.game_name,
          viewerCount: twitchStats.stream.viewer_count || 0,
          language: twitchStats.stream.language,
          startedAt: twitchStats.stream.started_at
        } : null,
        collectedAt: new Date()
      };

      analytics.summary.totalFollowers += analytics.platforms.twitch.followers;
      if (twitchStats.stream) {
        analytics.summary.totalViews += twitchStats.stream.viewer_count || 0;
      }
      analytics.summary.connectedPlatforms.push('twitch');
    }
  } catch (error) {
    console.error(`Error collecting Twitch data for user ${user.id}:`, error.message);
    analytics.platforms.twitch = { error: error.message, collectedAt: new Date() };
  }

  return analytics;
}

/**
 * Processes and stores analytics data for all users with connected social media accounts
 * @returns {Promise<Object>} Summary of collection results
 */
async function collectAllUsersAnalytics() {
  const startTime = Date.now();
  const results = {
    startTime: new Date(),
    endTime: null,
    duration: 0,
    usersProcessed: 0,
    usersWithData: 0,
    usersWithErrors: 0,
    totalPlatformsConnected: 0,
    errors: []
  };

  try {
    console.log('🔄 Starting nightly analytics collection...');

    // Get all users with connected social media accounts
    const users = await User.findAll({
      include: [
        { model: YouTubeChannel, required: false },
        { model: TwitchChannel, required: false }
      ],
      where: {
        // Only process users who have at least one connected platform
        [require('sequelize').Op.or]: [
          { '$YouTubeChannel.user_id$': { [require('sequelize').Op.ne]: null } },
          { '$TwitchChannel.user_id$': { [require('sequelize').Op.ne]: null } }
        ]
      }
    });


    // Process each user
    for (const user of users) {
      try {
        results.usersProcessed++;
        
        const analytics = await collectUserAnalytics(user);
        
        // Only store if we collected data from at least one platform
        if (analytics.summary.connectedPlatforms.length > 0) {
          // Store in AnalyticsSnapshot
          await AnalyticsSnapshot.create({
            user_id: user.id,
            demographics: {
              platforms: analytics.summary.connectedPlatforms,
              totalFollowers: analytics.summary.totalFollowers,
              totalViews: analytics.summary.totalViews,
              totalVideos: analytics.summary.totalVideos
            },
            engagementTrends: {
              youtube: analytics.platforms.youtube || null,
              twitch: analytics.platforms.twitch || null,
              collectionTimestamp: analytics.timestamp
            }
          });

          results.usersWithData++;
          results.totalPlatformsConnected += analytics.summary.connectedPlatforms.length;
          
          console.log(`✅ Collected data for user ${user.id} (${analytics.summary.connectedPlatforms.join(', ')})`);
        }

        // Small delay to avoid overwhelming APIs
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (userError) {
        results.usersWithErrors++;
        results.errors.push({
          userId: user.id,
          error: userError.message
        });
        console.error(`❌ Error processing user ${user.id}:`, userError.message);
      }
    }

    results.endTime = new Date();
    results.duration = Date.now() - startTime;

    // Log system event
    await SystemEvent.create({
      user_id: null, // System-wide event
      type: 'analytics.nightly_collection',
      metadata: {
        ...results,
        errors: results.errors.slice(0, 10) // Limit error details to avoid huge records
      }
    });

    console.log(`🎉 Analytics collection completed in ${results.duration}ms`);
    console.log(`📈 Processed: ${results.usersProcessed} users, Success: ${results.usersWithData}, Errors: ${results.usersWithErrors}`);

    return results;

  } catch (error) {
    results.endTime = new Date();
    results.duration = Date.now() - startTime;
    results.errors.push({ global: error.message });
    
    console.error('💥 Fatal error in analytics collection:', error);
    
    // Log system event even if there was a global error
    try {
      await SystemEvent.create({
        user_id: null,
        type: 'analytics.nightly_collection_failed',
        metadata: { error: error.message, duration: results.duration }
      });
    } catch (logError) {
      console.error('Failed to log system event:', logError);
    }
    
    throw error;
  }
}

/**
 * Get latest analytics snapshot for a user
 * @param {string} userId - User ID
 * @returns {Promise<Object|null>} Latest analytics data
 */
async function getLatestUserAnalytics(userId) {
  const snapshot = await AnalyticsSnapshot.findOne({
    where: { user_id: userId },
    order: [['created_at', 'DESC']]
  });

  return snapshot ? {
    id: snapshot.id,
    userId: snapshot.user_id,
    demographics: snapshot.demographics,
    engagementTrends: snapshot.engagementTrends,
    collectedAt: snapshot.created_at
  } : null;
}

/**
 * Get analytics history for a user
 * @param {string} userId - User ID
 * @param {number} limit - Number of snapshots to return
 * @returns {Promise<Array>} Historical analytics data
 */
async function getUserAnalyticsHistory(userId, limit = 30) {
  const snapshots = await AnalyticsSnapshot.findAll({
    where: { user_id: userId },
    order: [['created_at', 'DESC']],
    limit
  });

  return snapshots.map(snapshot => ({
    id: snapshot.id,
    userId: snapshot.user_id,
    demographics: snapshot.demographics,
    engagementTrends: snapshot.engagementTrends,
    collectedAt: snapshot.created_at
  }));
}

module.exports = {
  collectUserAnalytics,
  collectAllUsersAnalytics,
  getLatestUserAnalytics,
  getUserAnalyticsHistory
};
