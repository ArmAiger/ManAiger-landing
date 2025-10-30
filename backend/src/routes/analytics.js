const express = require("express");
const createError = require("http-errors");
const { authenticate } = require("../middleware/auth");
const { AnalyticsSnapshot, SystemEvent } = require("../db/sequelize");
const { getLatestUserAnalytics, getUserAnalyticsHistory } = require("../services/AnalyticsCollectionService");
const cronJobManager = require("../services/CronJobManager");
const router = express.Router();

router.post("/analytics/snapshot", authenticate, async (req, res, next) => {
  try {
    const { demographics = {}, engagementTrends = {} } = req.body || {};
    const row = await AnalyticsSnapshot.create({
      user_id: req.user.id,
      demographics,
      engagementTrends,
    });
    res.status(201).json(row);
  } catch (e) {
    next(e);
  }
});

router.get("/analytics/latest", authenticate, async (req, res, next) => {
  try {
    const analytics = await getLatestUserAnalytics(req.user.id);
    if (!analytics) throw createError(404, "No analytics data found");
    res.json(analytics);
  } catch (e) {
    next(e);
  }
});

// Get user's analytics history for graphs
router.get("/analytics/history", authenticate, async (req, res, next) => {
  try {
    const { limit = 30 } = req.query;
    const history = await getUserAnalyticsHistory(req.user.id, parseInt(limit));
    res.json({
      data: history,
      count: history.length,
      limit: parseInt(limit)
    });
  } catch (e) {
    next(e);
  }
});

// Get analytics dashboard data (formatted for charts)
router.get("/analytics/dashboard", authenticate, async (req, res, next) => {
  try {
    const { days = 30 } = req.query;
    const history = await getUserAnalyticsHistory(req.user.id, parseInt(days));
    
    if (history.length === 0) {
      return res.json({
        message: "No analytics data available yet. Data is collected nightly.",
        platforms: [],
        charts: {}
      });
    }

    // Format data for dashboard charts
    const dashboardData = {
      platforms: [],
      charts: {
        followers: [],
        views: [],
        videos: [],
        engagement: []
      },
      summary: {
        totalFollowers: 0,
        totalViews: 0,
        totalVideos: 0,
        connectedPlatforms: [],
        lastUpdated: null
      }
    };

    // Get latest data for summary
    const latest = history[0];
    if (latest) {
      dashboardData.summary = {
        totalFollowers: latest.demographics?.totalFollowers || 0,
        totalViews: latest.demographics?.totalViews || 0,
        totalVideos: latest.demographics?.totalVideos || 0,
        connectedPlatforms: latest.demographics?.platforms || [],
        lastUpdated: latest.collectedAt
      };
    }

    // Format historical data for charts
    history.reverse().forEach(snapshot => {
      const date = snapshot.collectedAt;
      
      dashboardData.charts.followers.push({
        date,
        value: snapshot.demographics?.totalFollowers || 0
      });
      
      dashboardData.charts.views.push({
        date,
        value: snapshot.demographics?.totalViews || 0
      });
      
      dashboardData.charts.videos.push({
        date,
        value: snapshot.demographics?.totalVideos || 0
      });

      // Platform-specific data
      const youtube = snapshot.engagementTrends?.youtube;
      const twitch = snapshot.engagementTrends?.twitch;
      
      if (youtube && !youtube.error) {
        dashboardData.charts.engagement.push({
          date,
          platform: 'youtube',
          subscribers: youtube.subscriberCount || 0,
          views: youtube.viewCount || 0,
          videos: youtube.videoCount || 0
        });
      }
      
      if (twitch && !twitch.error) {
        dashboardData.charts.engagement.push({
          date,
          platform: 'twitch',
          followers: twitch.followers || 0,
          isLive: twitch.isLive || false
        });
      }
    });

    res.json(dashboardData);
  } catch (e) {
    next(e);
  }
});

// Admin: Get cron job status
router.get("/analytics/cron-status", authenticate, async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      throw createError(403, 'Admin access required');
    }

    const status = cronJobManager.getStatus();
    res.json(status);
  } catch (e) {
    next(e);
  }
});

// Admin: Manually trigger analytics collection
router.post("/analytics/collect", authenticate, async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      throw createError(403, 'Admin access required');
    }

    const results = await cronJobManager.triggerAnalyticsCollection();
    
    await SystemEvent.create({
      user_id: req.user.id,
      type: "analytics.collected",
      metadata: { 
        collectionResults: results,
        triggeredManually: true
      },
    });
    
    res.json({
      message: "Analytics collection completed",
      results
    });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
