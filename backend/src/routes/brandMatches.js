const express = require("express");
const { Op } = require("sequelize");
const createError = require("http-errors");
const { authenticate } = require("../middleware/auth");
const { BrandMatch, SystemEvent, Brand } = require("../db/sequelize");
const { brandMatchCreateSchema } = require("../validators");
const { sendOutreachEmail } = require("../services/EmailService");
const { OUTREACH_BASE } = require("../email/template");
const router = express.Router();

async function getBrandMatchLimit(user) {
  switch (user.plan) {
    case 'free':
      return 3; // 3 matches per month for free users
    case 'pro':
      return 15; // 15 matches per month for pro users
    case 'vip':
      return Infinity; // Unlimited for VIP users
    default:
      return 3;
  }
}

// Helper to enforce Free plan monthly limit (3)

async function enforceBrandMatchLimit(user) {
  const limit = await getBrandMatchLimit(user);
  if (limit === Infinity) return limit;
  
  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setMonth(end.getMonth() + 1, 0);
  end.setHours(23, 59, 59, 999);
  
  const count = await BrandMatch.count({
    where: { 
      userId: user.id, 
      createdAt: { [Op.between]: [start, end] }
    },
  });
  
  if (count >= limit) {
    const upgradeMsg = user.plan === 'free' ? 
      'Upgrade to Pro for up to 15 matches or VIP for unlimited matches.' :
      'Upgrade to VIP for unlimited matches.';
    throw createError(
      402,
      `${user.plan.toUpperCase()} plan limit reached: ${limit} Brand Matches per month. ${upgradeMsg}`
    );
  }
  
  return limit - count;
}

// List with filters + pagination
router.get("/brand-matches", authenticate, async (req, res, next) => {
  try {
    const { status, q, page = 1, pageSize = 20 } = req.query;
    const where = { userId: req.user.id };
    
    // Handle filters
    if (status && status !== 'all') where.status = status;
    if (q) {
      where[Op.or] = [
        { brandName: { [Op.iLike]: `%${q}%` } },
        { source: { [Op.iLike]: `%${q}%` } },
        { fitReason: { [Op.iLike]: `%${q}%` } }
      ];
    }

    // Get matches with pagination
    const rows = await BrandMatch.findAndCountAll({
      where,
      limit: Number(pageSize),
      offset: (Number(page) - 1) * Number(pageSize),
      order: [["createdAt", "DESC"]],
      attributes: [
        'id', 'userId', 'source', 'brandName', 'fitReason',
        'outreachDraft', 'status', 'matchScore', 'createdAt', 'updatedAt', 'brandId',
        'dealType', 'estimatedRate', 'brandCountry', 'requiresShipping', 'brandWebsite', 'brandEmail'
      ],
      include: [
        {
          model: Brand,
          as: 'brand',
          required: false, // LEFT JOIN to include matches without brand_id
          attributes: [
            'id', 'name', 'description', 'website', 'industry', 
            'category', 'tags', 'socialMedia', 'contactInfo', 
            'companySize', 'location', 'targetAudience', 'brandValues',
            'averageCampaignBudget', 'preferredContentTypes', 'logoUrl'
          ]
        }
      ]
    });

    res.json({
      total: rows.count,
      page: Number(page),
      pageSize: Number(pageSize),
      data: rows.rows,
    });
  } catch (error) {
    console.error('Error fetching brand matches:', error);
    next(error);
  }
});

// Create from AI output placeholder
router.post("/brand-matches", authenticate, async (req, res, next) => {
  try {
    await enforceBrandMatchLimit(req.user);
    const { value, error } = brandMatchCreateSchema.validate(req.body);
    if (error) throw createError(400, error.message);
    const row = await BrandMatch.create({
      userId: req.user.id,
      ...value,
      status: "draft",
    });
    res.status(201).json(row);
  } catch (e) {
    next(e);
  }
});

// Update brand match status
router.patch("/brand-matches/:id/status", authenticate, async (req, res, next) => {
  try {
    const { status } = req.body;
    
    // Validate status
    const validStatuses = ['draft', 'sent', 'contacted', 'interested', 'accepted', 'rejected', 'completed'];
    if (!validStatuses.includes(status)) {
      throw createError(400, `Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }

    const brandMatch = await BrandMatch.findOne({
      where: { id: req.params.id, userId: req.user.id },
    });

    if (!brandMatch) {
      throw createError(404, "Brand match not found");
    }

    const oldStatus = brandMatch.status;
    brandMatch.status = status;
    await brandMatch.save();

    // Log the status change
    await SystemEvent.create({
      user_id: req.user.id,
      type: "brand_match_status_updated",
      metadata: { 
        brandMatchId: brandMatch.id,
        brandName: brandMatch.brandName,
        oldStatus,
        newStatus: status
      },
    });

    res.json({
      message: `Brand match status updated to ${status}`,
      data: brandMatch
    });
  } catch (error) {
    next(error);
  }
});

// Send outreach email
router.post(
  "/brand-matches/:id/outreach",
  authenticate,
  async (req, res, next) => {
    try {
      const bm = await BrandMatch.findOne({
        where: { id: req.params.id, userId: req.user.id },
        include: [
          {
            model: Brand,
            as: 'brand',
            required: false,
            attributes: ['contactInfo']
          }
        ]
      });
      
      if (!bm) throw createError(404, "BrandMatch not found");
      
      const {
        to,
        subject = `Partnership Opportunity with ${bm.brandName}`,
        message,
        useGmail = false
      } = req.body;

      if (!message) {
        throw createError(400, "Message is required");
      }

      // Determine the email recipient
      let emailTo = to;
      if (!emailTo) {
        // Try to get email from brand match or brand
        emailTo = bm.brandEmail || bm.brand?.contactInfo?.email;
        
        if (!emailTo) {
          throw createError(400, "No email address provided. Please provide an email address or ensure the brand has contact information.");
        }
      }

      let resp;
      
      if (useGmail) {
        // Send via Gmail if user has it connected
        const { User } = require('../db/sequelize');
        const user = await User.findByPk(req.user.id, {
          attributes: ['gmail_access_token', 'gmail_refresh_token', 'gmail_email']
        });

        if (!user.gmail_access_token) {
          throw createError(400, 'Gmail not connected. Please connect your Gmail account first.');
        }

        const GmailService = require('../services/GmailService');
        resp = await GmailService.sendEmail({
          accessToken: user.gmail_access_token,
          refreshToken: user.gmail_refresh_token,
          to: emailTo,
          subject,
          message,
          replyTo: user.gmail_email
        });

        // Log Gmail-specific event
        await SystemEvent.create({
          user_id: req.user.id,
          type: "gmail.outreach.sent",
          metadata: { 
            brandMatchId: bm.id, 
            brandName: bm.brandName,
            to: emailTo,
            via: 'gmail',
            messageId: resp.messageId
          },
        });
      } else {
        // Use the existing email service (placeholder)
        const body = OUTREACH_BASE({
          creatorName: req.user.name || req.user.email,
          brandName: bm.brandName,
          pitch: message,
        });
        
        resp = await sendOutreachEmail({
          user: req.user,
          to: emailTo,
          subject,
          body,
        });

        // Log standard outreach event
        await SystemEvent.create({
          user_id: req.user.id,
          type: "outreach.sent",
          metadata: { 
            brandMatchId: bm.id, 
            brandName: bm.brandName,
            to: emailTo,
            via: 'system'
          },
        });
      }

      // Create a deal when outreach is sent
      const { Deal } = require('../db/sequelize');
      
      try {
        // Check if a deal already exists for this brand match
        let existingDeal = await Deal.findOne({
          where: {
            creator_id: req.user.id,
            title: `${bm.brandName} Partnership`
          }
        });

        if (!existingDeal) {
          // Create a new deal
          const deal = await Deal.create({
            creator_id: req.user.id,
            brand_id: bm.brandId || null, // Use brandId if available
            title: `${bm.brandName} Partnership`,
            status: 'OUTREACH_SENT',
            proposed_amount: null, // Can be updated later during negotiation
            outreach_sent_at: new Date()
          });

          // Create deal activity for the outreach
          const { DealActivity } = require('../db/sequelize');
          await DealActivity.create({
            deal_id: deal.id,
            type: 'outreach.sent',
            message: `Outreach email sent to ${bm.brandName} (${emailTo})`,
            actor: req.user.name || req.user.email,
            metadata: {
              brandMatchId: bm.id,
              emailTo: emailTo,
              subject: subject,
              via: useGmail ? 'gmail' : 'system',
              messageId: resp.messageId || resp.id
            }
          });
        } else {
          // Update existing deal status if it's still a prospect
          if (existingDeal.status === 'PROSPECT') {
            existingDeal.status = 'OUTREACH_SENT';
            existingDeal.outreach_sent_at = new Date();
            await existingDeal.save();

            // Add activity to existing deal
            const { DealActivity } = require('../db/sequelize');
            await DealActivity.create({
              deal_id: existingDeal.id,
              type: 'outreach.sent',
              message: `Follow-up outreach email sent to ${bm.brandName} (${emailTo})`,
              actor: req.user.name || req.user.email,
              metadata: {
                brandMatchId: bm.id,
                emailTo: emailTo,
                subject: subject,
                via: useGmail ? 'gmail' : 'system',
                messageId: resp.messageId || resp.id
              }
            });
          }
        }
      } catch (dealError) {
        console.error('Error creating/updating deal for outreach:', dealError);
        // Don't fail the outreach if deal creation fails
      }

      bm.status = "sent";
      await bm.save();
      
      res.json({ 
        success: true, 
        emailSent: true,
        to: emailTo,
        via: useGmail ? 'gmail' : 'system',
        providerResponse: resp 
      });
    } catch (e) {
      next(e);
    }
  }
);
module.exports = router;
