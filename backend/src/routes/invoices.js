const express = require("express");
const createError = require("http-errors");
const { authenticate } = require("../middleware/auth");
const { invoiceCreateSchema } = require("../validators");
const { Invoice, Deal, SystemEvent } = require("../db/sequelize");
const { createCheckoutForInvoice, createStripeInvoice } = require("../services/StripeService");
const router = express.Router();
// Create Invoice + Stripe Invoice (improved version)
router.post("/invoices", authenticate, async (req, res, next) => {
  try {
    const { value, error } = invoiceCreateSchema.validate(req.body);
    if (error) throw createError(400, error.message);
    
    const { 
      dealId, 
      brandName, 
      amount, 
      currency, 
      description, 
      useStripeInvoice = false,
      dueDate,
      paymentTerms = 'due_on_receipt',
      footer,
      projectReference,
      // New BYOP fields
      paymentMethodType = 'STRIPE_ADMIN',
      customPaymentLink,
      customPaymentInstructions
    } = value;

    console.log('Creating invoice with data:', { 
      dealId, brandName, amount, currency, description, useStripeInvoice,
      dueDate, paymentTerms, footer, projectReference,
      paymentMethodType, customPaymentLink: customPaymentLink ? '[REDACTED]' : null
    });

    let deal = null;

    if (dealId) {
      deal = await Deal.findOne({
        where: { id: dealId, creator_id: req.user.id },
      });
      if (!deal) throw createError(404, "Deal not found");
    }

    // Create invoice record in database
    const invoice = await Invoice.create({
      user_id: req.user.id,
      deal_id: dealId,
      brand_name: brandName, // Use the exact database field name
      amount: amount,
      currency: currency,
      status: "unpaid",
      payment_method_type: paymentMethodType,
      custom_payment_link: customPaymentLink || null,
      custom_payment_instructions: customPaymentInstructions || null,
      description: description || `Brand Deal Invoice`
    });
    

    let paymentUrl;
    let invoiceData;

    if (paymentMethodType === 'CUSTOM_LINK') {
      // Use creator's custom payment link
      invoice.paymentUrl = customPaymentLink;
      await invoice.save();
      
      invoiceData = {
        id: invoice.id,
        status: invoice.status,
        paymentUrl: customPaymentLink,
        paymentMethodType: 'CUSTOM_LINK',
        customPaymentInstructions: customPaymentInstructions,
        invoiceNumber: `INV-${invoice.id.substring(0, 8).toUpperCase()}`,
        message: 'Invoice created with custom payment link'
      };
      
    } else if (useStripeInvoice) {
      // Use Stripe's native invoice system
      const stripeInvoice = await createStripeInvoice({
        user: req.user,
        amount: Number(amount),
        currency: currency,
        description: description || `Brand Deal Invoice ${invoice.id}`,
        metadata: { 
          invoiceId: invoice.id, 
          userId: req.user.id,
          dealId: dealId || null
        },
        dueDate,
        paymentTerms,
        footer,
        projectReference: projectReference || `Deal #${dealId || invoice.id}`
      });

      // Update our invoice with Stripe invoice ID
      invoice.stripeInvoiceId = stripeInvoice.id;
      invoice.invoiceNumber = stripeInvoice.number;
      invoice.description = description || `Brand Deal Invoice ${invoice.id}`;
      invoice.paymentUrl = stripeInvoice.hosted_invoice_url;
      paymentUrl = stripeInvoice.hosted_invoice_url;
      
      invoiceData = {
        id: invoice.id,
        status: invoice.status,
        paymentUrl: paymentUrl,
        stripeInvoiceId: stripeInvoice.id,
        invoiceNumber: stripeInvoice.number,
        invoicePdf: stripeInvoice.invoice_pdf
      };
    } else {
      // Use checkout session (legacy method)
      const session = await createCheckoutForInvoice({
        user: req.user,
        amount: Number(amount),
        currency: currency,
        metadata: { invoiceId: invoice.id, userId: req.user.id },
      });

      invoice.stripeCheckoutSessionId = session.id;
      invoice.paymentUrl = session.url;
      invoice.description = description || `Brand Deal Invoice ${invoice.id}`;
      paymentUrl = session.url;
      
      invoiceData = {
        id: invoice.id,
        status: invoice.status,
        checkoutUrl: paymentUrl,
        sessionId: session.id
      };
    }

    await invoice.save();

    await SystemEvent.create({
      user_id: req.user.id,
      type: "invoice.created",
      metadata: { 
        invoiceId: invoice.id,
        amount: amount,
        brandName: brandName,
        currency: currency,
        method: useStripeInvoice ? 'stripe_invoice' : 'checkout_session',
        paymentUrl
      },
    });

    res.status(201).json(invoiceData);
  } catch (e) {
    next(e);
  }
});

// Get all invoices for the authenticated user
router.get("/invoices", authenticate, async (req, res, next) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    const whereClause = { user_id: req.user.id };
    if (status && status !== 'all') {
      whereClause.status = status;
    }

    const invoices = await Invoice.findAndCountAll({
      where: whereClause,
      include: [{
        model: Deal,
        required: false,
        attributes: ['id', 'title', 'status'] // Use 'title' instead of non-existent 'brandName'
      }],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: offset
    });

    res.json({
      invoices: invoices.rows.map(invoice => {
        const checkoutUrl = invoice.stripeCheckoutSessionId ? 
          `https://checkout.stripe.com/c/pay/${invoice.stripeCheckoutSessionId}` : null;
        const paymentUrl = invoice.paymentUrl || checkoutUrl;
        
        const invoiceData = {
          id: invoice.id,
          brandName: invoice.brand_name,
          amount: invoice.amount,
          currency: invoice.currency,
          status: invoice.status,
          paidAt: invoice.paidAt,
          createdAt: invoice.createdAt,
          deal: invoice.Deal ? {
            id: invoice.Deal.id,
            brandName: invoice.Deal.title, // Use 'title' field instead of non-existent 'brandName'
            status: invoice.Deal.status
          } : null,
          checkoutUrl: checkoutUrl,
          paymentUrl: paymentUrl,
          paymentMethodType: invoice.payment_method_type,
          customPaymentLink: invoice.custom_payment_link,
          customPaymentInstructions: invoice.custom_payment_instructions,
          // Debug info
          hasStripeCheckoutSessionId: !!invoice.stripeCheckoutSessionId,
          hasPaymentUrl: !!invoice.paymentUrl,
          stripeInvoiceId: invoice.stripeInvoiceId
        };
        
        return invoiceData;
      }),
      totalCount: invoices.count,
      totalPages: Math.ceil(invoices.count / parseInt(limit)),
      currentPage: parseInt(page)
    });
  } catch (e) {
    next(e);
  }
});

router.get("/invoices/:id", authenticate, async (req, res, next) => {
  try {
    const invoice = await Invoice.findOne({
      where: { id: req.params.id, user_id: req.user.id },
      include: [{
        model: Deal,
        required: false,
        attributes: ['id', 'title', 'status'] // Use 'title' instead of non-existent 'brandName'
      }]
    });
    if (!invoice) throw createError(404, "Invoice not found");
    res.json({
      id: invoice.id,
      brandName: invoice.brand_name,
      amount: invoice.amount,
      currency: invoice.currency,
      status: invoice.status,
      paidAt: invoice.paidAt,
      createdAt: invoice.createdAt,
      updatedAt: invoice.updatedAt,
      checkoutSessionId: invoice.stripeCheckoutSessionId,
      paymentMethodType: invoice.payment_method_type,
      customPaymentLink: invoice.custom_payment_link,
      customPaymentInstructions: invoice.custom_payment_instructions,
      deal: invoice.Deal ? {
        id: invoice.Deal.id,
        brandName: invoice.Deal.title, // Use 'title' field
        status: invoice.Deal.status
      } : null,
      checkoutUrl: invoice.stripeCheckoutSessionId ? 
        `https://checkout.stripe.com/c/pay/${invoice.stripeCheckoutSessionId}` : null,
      paymentUrl: invoice.paymentUrl || (invoice.stripeCheckoutSessionId ? 
        `https://checkout.stripe.com/c/pay/${invoice.stripeCheckoutSessionId}` : null)
    });
  } catch (e) {
    next(e);
  }
});

// Get invoice statistics
router.get("/invoices/stats/summary", authenticate, async (req, res, next) => {
  try {
    const [totalInvoices, paidInvoices, unpaidInvoices, totalRevenue] = await Promise.all([
      Invoice.count({ where: { user_id: req.user.id } }),
      Invoice.count({ where: { user_id: req.user.id, status: 'paid' } }),
      Invoice.count({ where: { user_id: req.user.id, status: 'unpaid' } }),
      Invoice.sum('amount', { where: { user_id: req.user.id, status: 'paid' } })
    ]);

    res.json({
      totalInvoices,
      paidInvoices,
      unpaidInvoices,
      voidInvoices: totalInvoices - paidInvoices - unpaidInvoices,
      totalRevenue: totalRevenue || 0
    });
  } catch (e) {
    next(e);
  }
});

// Mark invoice as sent (from deals spec)
router.post("/invoices/:id/mark-sent", authenticate, async (req, res, next) => {
  try {
    const { method, to } = req.body;
    
    const invoice = await Invoice.findOne({
      where: { id: req.params.id, user_id: req.user.id }
    });

    if (!invoice) {
      throw createError(404, "Invoice not found");
    }

    if (invoice.status !== 'unpaid' && invoice.status !== 'draft') {
      throw createError(400, "Invoice cannot be marked as sent from current status");
    }

    invoice.status = 'sent';
    invoice.sent_at = new Date();
    await invoice.save();

    // Update deal status if linked
    if (invoice.deal_id) {
      const { Deal } = require("../db/sequelize");
      const deal = await Deal.findByPk(invoice.deal_id);
      if (deal && deal.status === 'AGREEMENT_LOCKED') {
        deal.status = 'INVOICED';
        deal.invoiced_at = new Date();
        deal.invoice_id = invoice.id;
        await deal.save();
      }
    }

    res.json({
      status: invoice.status,
      sent_at: invoice.sent_at
    });
  } catch (e) {
    next(e);
  }
});

// Mark invoice as paid (from deals spec)
router.post("/invoices/:id/mark-paid", authenticate, async (req, res, next) => {
  try {
    const { paid_at, method, reference } = req.body;
    
    const invoice = await Invoice.findOne({
      where: { id: req.params.id, user_id: req.user.id }
    });

    if (!invoice) {
      throw createError(404, "Invoice not found");
    }

    if (invoice.status !== 'sent' && invoice.status !== 'unpaid') {
      throw createError(400, "Invoice cannot be marked as paid from current status");
    }

    invoice.status = 'paid';
    invoice.paid_at = paid_at ? new Date(paid_at) : new Date();
    if (method) invoice.payment_method = method;
    if (reference) invoice.payment_reference = reference;
    
    await invoice.save();

    // Update deal status if linked
    if (invoice.deal_id) {
      const { Deal } = require("../db/sequelize");
      const deal = await Deal.findByPk(invoice.deal_id);
      if (deal && deal.status === 'INVOICED') {
        deal.status = 'PAID';
        deal.paid_at = invoice.paid_at;
        deal.closed_at = invoice.paid_at;
        await deal.save();

        // Log activity for deal
        const { DealActivity } = require("../db/sequelize");
        await DealActivity.create({
          deal_id: deal.id,
          type: 'payment.received',
          message: `Invoice ${invoice.id} marked as paid`,
          actor: req.user.name || req.user.email,
          metadata: { invoice_id: invoice.id, amount: invoice.amount, method, reference }
        });
      }
    }

    res.json({
      status: invoice.status,
      paid_at: invoice.paid_at
    });
  } catch (e) {
    next(e);
  }
});

module.exports = router;