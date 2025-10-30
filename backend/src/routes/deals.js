const express = require('express');
const { authenticate } = require('../middleware/auth');
const { Deal, Brand, ConversationLog, DealActivity, Invoice } = require('../db/sequelize');
const createError = require('http-errors');
const { Op } = require('sequelize');

const router = express.Router();

// Helper to validate UUID
function isValidUUID(id) {
  return typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

// Helper function to create activity log
async function logActivity(dealId, type, message, actor, metadata = null) {
  try {
    await DealActivity.create({
      deal_id: dealId,
      type,
      message,
      actor,
      metadata
    });
  } catch (error) {
    console.error('Error logging activity:', error.message);
  }
}

// 1) Create deal
router.post('/deals', authenticate, async (req, res, next) => {
  try {
  let { brand_id, brand_name, contact_name, contact_email, title, proposed_amount } = req.body;

    if (!title) {
      throw createError(400, 'Title is required');
    }

    let deal, brand = null;
    try {
      // Normalize: if a non-UUID brand_id was sent, treat it as brand_name
      if (brand_id && !isValidUUID(brand_id) && !brand_name) {
        brand_name = brand_id;
        brand_id = null;
      }

      let brandIdToUse = brand_id || null;
      // If no brand_id but a brand_name is provided, create or find the brand
      if (!brandIdToUse && brand_name) {
        brand = await Brand.findOne({ where: { name: brand_name } });
        if (!brand) {
          brand = await Brand.create({ name: brand_name });
        }
        // If contact info provided at deal creation, merge it into the brand's contactInfo
        if ((contact_name || contact_email) && brand) {
          const existing = brand.contactInfo || {};
          const updated = {
            ...existing,
            contactPerson: contact_name || existing.contactPerson,
            email: contact_email || existing.email
          };
          try {
            await brand.update({ contactInfo: updated });
            // reload brand instance to have updated contactInfo
            brand = await Brand.findByPk(brand.id);
          } catch (ciErr) {
            console.error('Failed to update brand contactInfo:', ciErr.message);
          }
        }
        brandIdToUse = brand.id;
      }
      deal = await Deal.create({
        creator_id: req.user.id,
        brand_id: brandIdToUse,
        title,
        proposed_amount: proposed_amount || null,
        status: 'PROSPECT'
      });
      // Fetch the brand info for the response. If still missing, attempt by deal.brand_id
      if (!brand && brandIdToUse) {
        brand = await Brand.findByPk(brandIdToUse);
      }
      if (!brand && deal && deal.brand_id) {
        brand = await Brand.findByPk(deal.brand_id);
      }
      // If contact info provided but brand exists without contactInfo, try to update now
      if (brand && (contact_name || contact_email)) {
        const existing = brand.contactInfo || {};
        const updated = {
          ...existing,
          contactPerson: contact_name || existing.contactPerson,
          email: contact_email || existing.email
        };
        try {
          await brand.update({ contactInfo: updated });
          brand = await Brand.findByPk(brand.id);
        } catch (ciErr) {
          console.error('Failed to update brand contactInfo after deal create:', ciErr.message);
        }
      }
    } catch (dealError) {
      console.error('Detailed Deal creation error:');
      console.error('Message:', dealError.message);
      console.error('SQL:', dealError.sql);
      console.error('Parameters:', dealError.parameters);
      console.error('Stack:', dealError.stack);
      throw dealError;
    }

    // Try to fetch the full deal record including related Brand to guarantee consistent response shape
    try {
      const fullDeal = await Deal.findByPk(deal.id, { include: [{ model: Brand, as: 'brand' }] });
      if (fullDeal && typeof fullDeal.toResponseFormat === 'function') {
        const resp = fullDeal.toResponseFormat();
        // Ensure dates.created_at and top-level created_at exist
        resp.dates = resp.dates || {};
        resp.dates.created_at = resp.dates.created_at || resp.created_at || new Date().toISOString();
        resp.created_at = resp.created_at || resp.dates.created_at;
        // Ensure brand contact fields are present for frontend convenience
        if (resp.brand) {
          resp.brand.contact_name = resp.brand.contact_name || resp.brand.contactInfo?.contactPerson || null;
          resp.brand.contact_email = resp.brand.contact_email || resp.brand.contactInfo?.email || null;
        }
        return res.status(201).json(resp);
      }
    } catch (fetchError) {
      console.error('Failed to fetch full deal for response:', fetchError.message);
      // fall through to manual response fallback
    }

    // Fallback manual response if fetching fullDeal failed for any reason
    res.status(201).json({
      id: deal.id,
      creator_id: deal.creator_id,
      brand_id: deal.brand_id,
      title: deal.title,
      status: deal.status,
      proposed_amount: deal.proposed_amount,
      agreed_amount: deal.agreed_amount,
      dates: {
        created_at: deal.created_at || new Date().toISOString(),
        outreach_sent_at: deal.outreach_sent_at,
        negotiation_started_at: deal.negotiation_started_at,
        agreement_locked_at: deal.agreement_locked_at,
        invoiced_at: deal.invoiced_at,
        paid_at: deal.paid_at,
        closed_at: deal.closed_at
      },
      brand: brand ? {
        id: brand.id,
        name: brand.name,
        description: brand.description,
        website: brand.website,
        industry: brand.industry,
        category: brand.category,
        tags: brand.tags,
        socialMedia: brand.socialMedia,
        contactInfo: brand.contactInfo,
        companySize: brand.companySize,
        location: brand.location,
        targetAudience: brand.targetAudience,
        brandValues: brand.brandValues,
        collaborationHistory: brand.collaborationHistory,
        averageCampaignBudget: brand.averageCampaignBudget,
        preferredContentTypes: brand.preferredContentTypes,
        isActive: brand.isActive,
        lastUpdated: brand.lastUpdated,
        source: brand.source,
        logoUrl: brand.logoUrl
      } : null
    });
  } catch (error) {
    console.error('Deal creation error:', error.message);
    next(error);
  }
});

// 2) List deals
router.get('/deals', authenticate, async (req, res, next) => {
  try {
    const { status } = req.query;
    const { cursor, page = 1, limit = 10 } = req.query;
    
    const where = { creator_id: req.user.id };
    if (status) {
      where.status = status;
    }

    // Test brand table exists
    try {
      const brandCount = await Brand.count();
    } catch (brandError) {
      // Brand table has issues
    }

    // First try without brand include to isolate the issue
    const options = {
      where,
      // Enable brand include to get brand information
      include: [{ model: Brand, as: 'brand' }],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit)
    };

    // Handle pagination
    if (cursor) {
      where.created_at = { [Op.lt]: new Date(cursor) };
    } else if (page > 1) {
      options.offset = (page - 1) * parseInt(limit);
    }

    const deals = await Deal.findAll(options);

    // Prefer model's toResponseFormat() to ensure consistent shape (brand contact fields + dates)
    const formattedDeals = deals.map(deal => {
      try {
        if (deal && typeof deal.toResponseFormat === 'function') {
          return deal.toResponseFormat();
        }
      } catch (e) {
        // fall back to manual mapping
      }

      const b = deal.brand;
      const createdAt = deal.created_at || (deal.dates && deal.dates.created_at) || new Date().toISOString();

      return {
        id: deal.id,
        creator_id: deal.creator_id,
        brand_id: deal.brand_id,
        title: deal.title,
        status: deal.status,
        proposed_amount: deal.proposed_amount,
        agreed_amount: deal.agreed_amount,
        created_at: createdAt,
        updated_at: deal.updated_at,
        dates: {
          created_at: createdAt,
          outreach_sent_at: deal.outreach_sent_at,
          negotiation_started_at: deal.negotiation_started_at,
          agreement_locked_at: deal.agreement_locked_at,
          invoiced_at: deal.invoiced_at,
          paid_at: deal.paid_at,
          closed_at: deal.closed_at
        },
        brand: b ? {
          id: b.id,
          name: b.name,
          description: b.description,
          website: b.website,
          industry: b.industry,
          category: b.category,
          tags: b.tags,
          socialMedia: b.socialMedia,
          contactInfo: b.contactInfo,
          contact_name: b.contactInfo?.contactPerson || null,
          contact_email: b.contactInfo?.email || null,
          companySize: b.companySize,
          location: b.location,
          targetAudience: b.targetAudience,
          brandValues: b.brandValues,
          collaborationHistory: b.collaborationHistory,
          averageCampaignBudget: b.averageCampaignBudget,
          preferredContentTypes: b.preferredContentTypes,
          isActive: b.isActive,
          lastUpdated: b.lastUpdated,
          source: b.source,
          logoUrl: b.logoUrl
        } : null
      };
    });

    const response = {
      items: formattedDeals
    };

    // Add next cursor if there are more items
    if (deals.length === parseInt(limit)) {
      const lastDeal = deals[deals.length - 1];
      response.next_cursor = lastDeal.created_at.toISOString();
    }

    res.json(response);
  } catch (error) {
    console.error('GET deals error:', error.message);
    console.error('Error stack:', error.stack);
    next(error);
  }
});

// 3) Get single deal
router.get('/deals/:id', authenticate, async (req, res, next) => {
  try {
    const deal = await Deal.findOne({
      where: { id: req.params.id, creator_id: req.user.id },
      include: [
        { model: Brand, as: 'brand' },
        { model: Invoice, as: 'invoices' }
      ]
    });

    if (!deal) {
      throw createError(404, 'Deal not found');
    }

    // Safe response formatting
    let dealResponse;
    try {
      dealResponse = deal.toResponseFormat();
    } catch (formatError) {
      dealResponse = {
        id: deal.id,
        creator_id: deal.creator_id,
        brand_id: deal.brand_id,
        title: deal.title,
        status: deal.status,
        proposed_amount: deal.proposed_amount,
        agreed_amount: deal.agreed_amount,
        created_at: deal.created_at,
        updated_at: deal.updated_at,
        brand: deal.brand ? {
          id: deal.brand.id,
          name: deal.brand.name
        } : null
      };
    }

    res.json(dealResponse);
  } catch (error) {
    next(error);
  }
});

// 4) Log conversation
router.post('/deals/:id/conversations', authenticate, async (req, res, next) => {
  try {
    const { channel, direction, timestamp, summary, disposition, amount, terms_delta, attachments } = req.body;

    const deal = await Deal.findOne({
      where: { id: req.params.id, creator_id: req.user.id }
    });

    if (!deal) {
      throw createError(404, 'Deal not found');
    }

    const conversation = await ConversationLog.create({
      deal_id: req.params.id,
      channel,
      direction,
      timestamp: timestamp ? new Date(timestamp) : new Date(),
      summary,
      disposition,
      amount: amount || null,
      terms_delta,
      attachments
    });

    // Log activity
    await logActivity(
      req.params.id,
      'conversation.logged',
      `${direction} ${channel} conversation: ${disposition}`,
      req.user.name || req.user.email,
      { conversation_id: conversation.id }
    );

    res.status(201).json({
      id: conversation.id,
      channel,
      direction,
      timestamp: conversation.timestamp,
      summary,
      disposition,
      amount,
      terms_delta,
      attachments
    });
  } catch (error) {
    next(error);
  }
});

// 4.1) Get conversations for a deal
router.get('/deals/:id/conversations', authenticate, async (req, res, next) => {
  try {
    const deal = await Deal.findOne({
      where: { id: req.params.id, creator_id: req.user.id }
    });

    if (!deal) {
      throw createError(404, 'Deal not found');
    }

    const conversations = await ConversationLog.findAll({
      where: { deal_id: req.params.id },
      order: [['timestamp', 'DESC']]
    });

    res.json({
      items: conversations.map(conv => ({
        id: conv.id,
        channel: conv.channel,
        direction: conv.direction,
        timestamp: conv.timestamp,
        summary: conv.summary,
        disposition: conv.disposition,
        amount: conv.amount,
        terms_delta: conv.terms_delta,
        attachments: conv.attachments,
        created_at: conv.created_at
      }))
    });
  } catch (error) {
    next(error);
  }
});

//5) Status transition
router.post('/deals/:id/transition', authenticate, async (req, res, next) => {
  try {
    const { to, notes } = req.body;

    let deal;
    try {
      deal = await Deal.findOne({
        where: { id: req.params.id, creator_id: req.user.id },
        include: [{ model: Brand, as: 'brand' }]
      });
    } catch (includeError) {
      // Fallback: try without brand include
      deal = await Deal.findOne({
        where: { id: req.params.id, creator_id: req.user.id }
      });
    }

    if (!deal) {
      throw createError(404, 'Deal not found');
    }

    // Fallback validation if method is missing
    if (typeof deal.canTransitionTo !== 'function') {
      const validTransitions = {
        'PROSPECT': ['OUTREACH_SENT', 'DECLINED'],
        'OUTREACH_SENT': ['NEGOTIATION', 'DECLINED'],
        'NEGOTIATION': ['AGREEMENT_LOCKED', 'DECLINED'],
        'AGREEMENT_LOCKED': ['INVOICED', 'DECLINED'],
        'INVOICED': ['PAID', 'DECLINED'],
        'PAID': [],
        'DECLINED': []
      };
      const canTransition = validTransitions[deal.status]?.includes(to) || false;
      if (!canTransition) {
        return res.status(422).json({ error: 'INVALID_TRANSITION' });
      }
    } else {
      if (!deal.canTransitionTo(to)) {
        return res.status(422).json({ error: 'INVALID_TRANSITION' });
      }
    }

    const oldStatus = deal.status;
    deal.status = to;

    // Set timestamp fields based on status
    const now = new Date();
    switch (to) {
      case 'OUTREACH_SENT':
        deal.outreach_sent_at = now;
        break;
      case 'NEGOTIATION':
        deal.negotiation_started_at = now;
        break;
      case 'AGREEMENT_LOCKED':
        deal.agreement_locked_at = now;
        break;
      case 'INVOICED':
        deal.invoiced_at = now;
        break;
      case 'PAID':
        deal.paid_at = now;
        deal.closed_at = now;
        break;
      case 'DECLINED':
        deal.closed_at = now;
        if (notes) deal.lost_reason = notes;
        break;
    }

    await deal.save();

    // Log activity
    await logActivity(
      req.params.id,
      'status.changed',
      `Status changed from ${oldStatus} to ${to}${notes ? ': ' + notes : ''}`,
      req.user.name || req.user.email,
      { from: oldStatus, to, notes }
    );

    // Safe response formatting
    let dealResponse;
    try {
      dealResponse = deal.toResponseFormat();
    } catch (formatError) {
      dealResponse = {
        id: deal.id,
        creator_id: deal.creator_id,
        brand_id: deal.brand_id,
        title: deal.title,
        status: deal.status,
        proposed_amount: deal.proposed_amount,
        agreed_amount: deal.agreed_amount,
        created_at: deal.created_at,
        updated_at: deal.updated_at,
        brand: deal.brand ? {
          id: deal.brand.id,
          name: deal.brand.name
        } : null
      };
    }

    res.json({
      deal: dealResponse,
      activity: {
        type: 'status.changed',
        from: oldStatus,
        to,
        notes
      }
    });
  } catch (error) {
    console.error('❌ Deal transition error:', error.message);
    console.error('Error stack:', error.stack);
    next(error);
  }
});

// 6) Quick helpers - Mark Negotiation
router.post('/deals/:id/mark-negotiation', authenticate, async (req, res, next) => {
  try {
    const deal = await Deal.findOne({
      where: { id: req.params.id, creator_id: req.user.id },
      include: [{ model: Brand, as: 'brand' }]
    });

    if (!deal) {
      throw createError(404, 'Deal not found');
    }

    // Fallback validation if canTransitionTo method is missing
    if (typeof deal.canTransitionTo !== 'function') {
      const validTransitions = {
        'PROSPECT': ['OUTREACH_SENT', 'DECLINED'],
        'OUTREACH_SENT': ['NEGOTIATION', 'DECLINED'],
        'NEGOTIATION': ['AGREEMENT_LOCKED', 'DECLINED'],
        'AGREEMENT_LOCKED': ['INVOICED', 'DECLINED'],
        'INVOICED': ['PAID', 'DECLINED'],
        'PAID': [],
        'DECLINED': []
      };
      const canTransition = validTransitions[deal.status]?.includes('NEGOTIATION') || false;
      if (!canTransition) {
        return res.status(422).json({ error: 'INVALID_TRANSITION' });
      }
    } else {
      if (!deal.canTransitionTo('NEGOTIATION')) {
        return res.status(422).json({ error: 'INVALID_TRANSITION' });
      }
    }

    deal.status = 'NEGOTIATION';
    deal.negotiation_started_at = new Date();
    await deal.save();

    await logActivity(
      req.params.id,
      'negotiation.started',
      'Negotiation phase started',
      req.user.name || req.user.email
    );

    // Safe response formatting
    let dealResponse;
    try {
      dealResponse = deal.toResponseFormat();
    } catch (formatError) {
      dealResponse = {
        id: deal.id,
        creator_id: deal.creator_id,
        brand_id: deal.brand_id,
        title: deal.title,
        status: deal.status,
        proposed_amount: deal.proposed_amount,
        agreed_amount: deal.agreed_amount,
        created_at: deal.created_at,
        updated_at: deal.updated_at,
        brand: deal.brand ? {
          id: deal.brand.id,
          name: deal.brand.name
        } : null
      };
    }

    res.json(dealResponse);
  } catch (error) {
    next(error);
  }
});

// 7) Lock agreement
router.post('/deals/:id/lock-agreement', authenticate, async (req, res, next) => {
  try {
    const { terms } = req.body;

    const deal = await Deal.findOne({
      where: { id: req.params.id, creator_id: req.user.id },
      include: [{ model: Brand, as: 'brand' }]
    });

    if (!deal) {
      throw createError(404, 'Deal not found');
    }

    if (!deal.canTransitionTo('AGREEMENT_LOCKED')) {
      return res.status(422).json({ error: 'INVALID_TRANSITION' });
    }

    // Validate terms structure
    if (!terms || !terms.price || !terms.deliverables || terms.deliverables.length === 0) {
      throw createError(400, 'Invalid terms: price and deliverables are required');
    }

    // Create versioned terms snapshot
    const termsSnapshot = {
      ...terms,
      version: 1,
      locked_at: new Date().toISOString()
    };

    deal.status = 'AGREEMENT_LOCKED';
    deal.agreement_locked_at = new Date();
    deal.terms_snapshot = termsSnapshot;
    deal.agreed_amount = terms.price.amount;
    
    await deal.save();

    await logActivity(
      req.params.id,
      'agreement.locked',
      'Agreement terms locked',
      req.user.name || req.user.email,
      { terms_version: 1 }
    );

    res.json({
      deal: deal.toResponseFormat(),
      invoice_draft: {
        id: null,
        message: 'Use POST /api/invoices to create invoice'
      }
    });
  } catch (error) {
    next(error);
  }
});

// 8) Reopen negotiation
router.post('/deals/:id/reopen-negotiation', authenticate, async (req, res, next) => {
  try {
    const { reason } = req.body;

    const deal = await Deal.findOne({
      where: { id: req.params.id, creator_id: req.user.id },
      include: [{ model: Brand, as: 'brand' }]
    });

    if (!deal) {
      throw createError(404, 'Deal not found');
    }

    deal.status = 'NEGOTIATION';
    deal.agreement_locked_at = null;
    // Keep terms_snapshot for history but mark as superseded
    
    await deal.save();

    await logActivity(
      req.params.id,
      'negotiation.reopened',
      `Negotiation reopened: ${reason}`,
      req.user.name || req.user.email,
      { reason }
    );

    res.json(deal.toResponseFormat());
  } catch (error) {
    next(error);
  }
});

// 9) Get activity feed
router.get('/deals/:id/activity', authenticate, async (req, res, next) => {
  try {
    const deal = await Deal.findOne({
      where: { id: req.params.id, creator_id: req.user.id }
    });

    if (!deal) {
      throw createError(404, 'Deal not found');
    }

    const activities = await DealActivity.findAll({
      where: { deal_id: req.params.id },
      order: [['created_at', 'DESC']]
    });

    res.json({
      items: activities.map(activity => ({
        id: activity.id,
        type: activity.type,
        message: activity.message,
        created_at: activity.created_at,
        actor: activity.actor,
        metadata: activity.metadata
      }))
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
