const express = require('express');
const { authenticate } = require('../middleware/auth');
const { BrandMatch, Invoice, SystemEvent } = require('../db/sequelize');
const { Op } = require('sequelize');
const router = express.Router();

// Get dashboard stats
router.get('/dashboard/stats', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    // Get brand matches count
    const brandMatchesCount = await BrandMatch.count({
      where: { userId }
    });

    // Get deals in progress (invoices that are not yet paid)
    const dealsInProgress = await Invoice.count({
      where: {
        user_id: userId,
        status: 'unpaid'
      }
    });

    // Get earnings this month (paid invoices in current month)
    const earningsThisMonth = await Invoice.sum('amount', {
      where: {
        user_id: userId,
        status: 'paid',
        paidAt: {
          [Op.gte]: startOfMonth
        }
      }
    }) || 0;

    // Get total earnings (all paid invoices)
    const totalEarnings = await Invoice.sum('amount', {
      where: {
        user_id: userId,
        status: 'paid'
      }
    }) || 0;

    res.json({
      data: {
        brandMatchesCount,
        dealsInProgress,
        earningsThisMonth: Math.round(earningsThisMonth * 100) / 100, // Round to 2 decimal places
        totalEarnings: Math.round(totalEarnings * 100) / 100
      }
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    next(error);
  }
});

// Get recent activities
router.get('/dashboard/activities', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 10;

    const activities = await SystemEvent.findAll({
      where: { user_id: userId },
      order: [['createdAt', 'DESC']],
      limit,
      attributes: ['id', 'type', 'createdAt', 'metadata']
    });

    const activityFeed = activities.map(event => {
      let message = '';
      switch (event.type) {
        case 'brand_match.generated':
          const count = event.metadata?.count || 1;
          message = `Generated ${count} new brand match${count > 1 ? 'es' : ''}`;
          break;
        case 'outreach.sent':
          const brandName = event.metadata?.brandName || 'a brand';
          message = `Sent outreach email to ${brandName}`;
          break;
        case 'invoice.created':
          const invoiceAmount = event.metadata?.amount ? `$${parseFloat(event.metadata.amount).toFixed(0)}` : '';
          const invoiceBrandName = event.metadata?.brandName || 'client';
          message = invoiceAmount 
            ? `Created ${invoiceAmount} invoice for ${invoiceBrandName}`
            : `Created invoice for ${invoiceBrandName}`;
          break;
        case 'invoice.paid':
          const paidAmount = event.metadata?.amount ? `($${event.metadata.amount})` : '';
          const invoiceNumber = event.metadata?.invoiceNumber ? `#${event.metadata.invoiceNumber}` : '';
          message = `Invoice ${invoiceNumber} was paid ${paidAmount}`;
          break;
        case 'analytics.updated':
          const platform = event.metadata?.platform || 'social media';
          message = `Updated ${platform} analytics`;
          break;
        case 'user.register':
          message = 'Welcome to ManAIger!';
          break;
        case 'billing.subscribe':
          const plan = event.metadata?.plan || 'premium';
          message = `Upgraded to ${plan.toUpperCase()} plan`;
          break;
        default:
          message = 'Activity recorded';
      }

      return {
        id: event.id,
        type: event.type.replace('.', '_'),
        message,
        createdAt: event.createdAt,
        metadata: event.metadata
      };
    });

    res.json({
      data: activityFeed
    });
  } catch (error) {
    console.error('Dashboard activities error:', error);
    next(error);
  }
});

module.exports = router;
