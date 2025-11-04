const Stripe = require("stripe");
const { stripe } = require("../config");
const _stripe = new Stripe(stripe.secretKey, { apiVersion: "2024-06-20" });

async function ensureCustomer(user) {
  if (user.stripeCustomerId) return user.stripeCustomerId;
  const customer = await _stripe.customers.create({
    email: user.email,
    name: user.name || user.email,
  });
  user.stripeCustomerId = customer.id;
  await user.save();
  return customer.id;
}

async function clearIncompleteSubscriptions(customerId) {
  if (!customerId) return;

  const subs = await _stripe.subscriptions.list({
    customer: customerId,
    status: 'incomplete',
  });

  // Cancel all incomplete subscriptions
  for (const sub of subs.data) {
    await _stripe.subscriptions.cancel(sub.id);
  }
}

async function subscribeUser(user, plan, successUrl, cancelUrl) {
  const customerId = await ensureCustomer(user);
  
  // Clear any incomplete subscriptions first
  await clearIncompleteSubscriptions(customerId);

  // Get the correct price ID based on plan
  let priceId;
  if (plan === "vip") {
    priceId = stripe.priceVip;
  } else if (plan === "pro") {
    priceId = stripe.pricePro;
  } else if (plan === "starter") {
    priceId = stripe.priceStarter;
  } else {
    throw new Error("Invalid plan provided");
  }

  // Create a checkout session
  const session = await _stripe.checkout.sessions.create({
    customer: customerId,
    line_items: [{
      price: priceId,
      quantity: 1,
    }],
    mode: 'subscription',
    success_url: successUrl,
    cancel_url: cancelUrl,
  });

  return { url: session.url };
}

async function cancelSubscriptionAtPeriodEnd(stripeCustomerId) {
  const subs = await _stripe.subscriptions.list({
    customer: stripeCustomerId,
    status: "active",
    limit: 1,
  });
  if (subs.data[0]) {
    const updated = await _stripe.subscriptions.update(subs.data[0].id, {
      cancel_at_period_end: true,
    });
    return updated;
  }
  return null;
}

// Immediate cancellation function that also handles brand match cleanup
async function cancelSubscriptionImmediately(stripeCustomerId) {
  const { BrandMatch, User } = require("../db/sequelize");
  
  // Find user by stripe customer ID
  const user = await User.findOne({ where: { stripeCustomerId } });
  if (!user) {
    throw new Error("User not found");
  }

  // Get all subscriptions (active and inactive)
  const subs = await _stripe.subscriptions.list({
    customer: stripeCustomerId,
    limit: 10
  });
  
  let cancelledSubs = [];
  
  // Cancel all active subscriptions
  for (const sub of subs.data) {
    if (sub.status === 'active' || sub.status === 'trialing') {
      const cancelledSub = await _stripe.subscriptions.cancel(sub.id);
      cancelledSubs.push(cancelledSub);
    }
  }

  // Update user to free plan
  user.plan = "free";
  user.subscriptionStatus = "canceled";
  user.prioritySupport = false;
  await user.save();

  // Delete brand matches that exceed free plan limit (keep only 3)
  const allBrandMatches = await BrandMatch.findAll({
    where: { userId: user.id },
    order: [['createdAt', 'DESC']]
  });

  // Keep the 3 most recent brand matches for free plan
  const freeLimit = 3;
  let deletedMatches = 0;
  if (allBrandMatches.length > freeLimit) {
    const matchesToDelete = allBrandMatches.slice(freeLimit);
    const idsToDelete = matchesToDelete.map(match => match.id);
    
    await BrandMatch.destroy({
      where: { id: idsToDelete }
    });
    
    deletedMatches = idsToDelete.length;
  }

  return { 
    cancelledSubs, 
    deletedMatches,
    totalCancelledSubscriptions: cancelledSubs.length
  };
}

async function billingPortalSession(user, returnUrl) {
  const customerId = await ensureCustomer(user);
  const session = await _stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
  return session.url;
}

async function createStripeInvoice({ 
  user, 
  amount, 
  currency, 
  description, 
  metadata,
  dueDate,
  paymentTerms = 'due_on_receipt',
  footer,
  customFields = [],
  projectReference
}) {
  const customerId = await ensureCustomer(user);
  
  // Build custom fields
  const invoiceCustomFields = [];
  if (projectReference) {
    invoiceCustomFields.push({
      name: "Project Reference",
      value: projectReference
    });
  }
  // Add any additional custom fields
  invoiceCustomFields.push(...customFields);
  
  const invoiceData = {
    customer: customerId,
    currency: currency.toLowerCase(),
    description: description || "Brand Deal Invoice",
    metadata: metadata || {},
    auto_advance: false, // Don't auto-finalize
    
    // Payment settings with multiple options
    payment_settings: {
      payment_method_types: ['card', 'us_bank_account'],
      default_mandate: null
    },
    
    // Professional customization
    footer: footer || "Thank you for your business! Please contact us if you have any questions.",
    custom_fields: invoiceCustomFields.length > 0 ? invoiceCustomFields : undefined
  };
  
  // Handle payment terms and due dates
  if (paymentTerms === 'net_30') {
    invoiceData.collection_method = 'send_invoice';
    invoiceData.days_until_due = 30;
  } else if (paymentTerms === 'net_15') {
    invoiceData.collection_method = 'send_invoice';
    invoiceData.days_until_due = 15;
  } else if (paymentTerms === 'net_7') {
    invoiceData.collection_method = 'send_invoice';
    invoiceData.days_until_due = 7;
  } else if (dueDate) {
    // Custom due date
    invoiceData.collection_method = 'send_invoice';
    invoiceData.due_date = Math.floor(new Date(dueDate).getTime() / 1000);
  }
  
  // Create a Stripe invoice
  const invoice = await _stripe.invoices.create(invoiceData);

  // Add line item to the invoice
  await _stripe.invoiceItems.create({
    customer: customerId,
    invoice: invoice.id,
    amount: Math.round(amount * 100), // Convert to cents
    currency: currency.toLowerCase(),
    description: description || "Brand Deal Invoice",
  });

  // Finalize the invoice to make it ready for payment
  const finalizedInvoice = await _stripe.invoices.finalizeInvoice(invoice.id);
  
  return finalizedInvoice;
}

async function createCheckoutForInvoice({ user, amount, currency, metadata }) {
  const customerId = await ensureCustomer(user);
  const session = await _stripe.checkout.sessions.create({
    mode: "payment",
    customer: customerId,
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency,
          product_data: { name: "Brand Deal Invoice" },
          unit_amount: Math.round(amount * 100),
        },
        quantity: 1,
      },
    ],
    success_url: `${process.env.FRONTEND_URL}/payment/invoice-success-public?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.FRONTEND_URL}/payment/cancel`,
    metadata,
  });
  return session;
}

function rawStripe() {
  return _stripe;
}

module.exports = {
  ensureCustomer,
  clearIncompleteSubscriptions,
  subscribeUser,
  cancelSubscriptionAtPeriodEnd,
  cancelSubscriptionImmediately,
  billingPortalSession,
  createCheckoutForInvoice,
  createStripeInvoice,
  rawStripe,
};
