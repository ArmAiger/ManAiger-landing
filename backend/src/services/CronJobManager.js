const cron = require('node-cron');
const { collectAllUsersAnalytics } = require('./AnalyticsCollectionService');

class CronJobManager {
  constructor() {
    this.jobs = new Map();
    this.isRunning = false;
  }

  /**
   * Start all scheduled cron jobs
   */
  start() {
    if (this.isRunning) {
      return;
    }

    console.log('🚀 Starting cron job manager...');
    
    // Nightly analytics collection at 02:00 UTC
    this.scheduleAnalyticsCollection();
    
    // Health check job every hour
    this.scheduleHealthCheck();
    
    this.isRunning = true;
    console.log('✅ All cron jobs started successfully');
  }

  /**
   * Stop all scheduled cron jobs
   */
  stop() {
    console.log('🛑 Stopping all cron jobs...');
    
    this.jobs.forEach((job, name) => {
      job.stop();
      console.log(`⏹️ Stopped job: ${name}`);
    });
    
    this.jobs.clear();
    this.isRunning = false;
    console.log('✅ All cron jobs stopped');
  }

  /**
   * Schedule nightly analytics collection at 02:00 UTC
   */
  scheduleAnalyticsCollection() {
    // Cron expression: '0 2 * * *' = At 02:00 UTC every day
    const job = cron.schedule('0 2 * * *', async () => {
      console.log('🌙 Running nightly analytics collection at', new Date().toISOString());
      
      try {
        const results = await collectAllUsersAnalytics();
        console.log('📊 Nightly analytics collection completed:', {
          usersProcessed: results.usersProcessed,
          usersWithData: results.usersWithData,
          duration: `${results.duration}ms`,
          platforms: results.totalPlatformsConnected
        });
      } catch (error) {
        console.error('💥 Nightly analytics collection failed:', error);
        // In production, you might want to send alerts here
      }
    }, {
      scheduled: false, // Don't start automatically
      timezone: 'UTC'   // Ensure UTC timezone
    });

    this.jobs.set('analytics-collection', job);
    job.start();
    
    console.log('📅 Scheduled nightly analytics collection at 02:00 UTC');
  }

  /**
   * Schedule health check every hour to ensure system is responsive
   */
  scheduleHealthCheck() {
    // Cron expression: '0 * * * *' = At the start of every hour
    const job = cron.schedule('0 * * * *', () => {
      const now = new Date().toISOString();
      console.log(`💓 Health check at ${now} - Cron jobs running: ${this.isRunning}`);
      
      // Log active jobs
      console.log(`📋 Active jobs: ${Array.from(this.jobs.keys()).join(', ')}`);
    }, {
      scheduled: false,
      timezone: 'UTC'
    });

    this.jobs.set('health-check', job);
    job.start();
    
    console.log('⏰ Scheduled hourly health checks');
  }

  /**
   * Get status of all cron jobs
   */
  getStatus() {
    const status = {
      isRunning: this.isRunning,
      activeJobs: Array.from(this.jobs.keys()),
      jobCount: this.jobs.size,
      timestamp: new Date().toISOString()
    };

    return status;
  }

  /**
   * Manually trigger analytics collection (for testing)
   */
  async triggerAnalyticsCollection() {
    console.log('🔧 Manually triggering analytics collection...');

    try {
      const results = await collectAllUsersAnalytics();
      console.log('✅ Manual analytics collection completed:', results);
      return results;
    } catch (error) {
      console.error('❌ Manual analytics collection failed:', error);
      throw error;
    }
  }

  scheduleOneTimeJob(name, cronExpression, task) {
    if (this.jobs.has(name)) {
      console.log(`⚠️ Job ${name} already exists, stopping old one`);
      this.jobs.get(name).stop();
    }

    const job = cron.schedule(cronExpression, task, {
      scheduled: false,
      timezone: 'UTC'
    });

    this.jobs.set(name, job);
    job.start();

    console.log(`📅 Scheduled one-time job: ${name} with expression: ${cronExpression}`);
    return job;
  }
}

// Create singleton instance
const cronJobManager = new CronJobManager();

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('📡 Received SIGTERM, stopping cron jobs...');
  cronJobManager.stop();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('📡 Received SIGINT, stopping cron jobs...');
  cronJobManager.stop();
  process.exit(0);
});

module.exports = cronJobManager;
