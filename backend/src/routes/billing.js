const express = require("express");
const createError = require("http-errors");
const { authenticate } = require("../middleware/auth");
const {
  subscribeUser,
  cancelSubscriptionAtPeriodEnd,
  cancelSubscriptionImmediately,
  clearIncompleteSubscriptions,
  billingPortalSession,
} = require("../services/StripeService");
const { clearPendingSubscription } = require("../services/clearPendingSubscription");
const { Subscription, User, SystemEvent } = require("../db/sequelize");
const { app } = require("../config");
const router = express.Router();

// Clear pending subscription
router.post("/billing/clear-pending", authenticate, async (req, res, next) => {
  try {
    await clearPendingSubscription(req.user);
    res.json({ message: "Pending subscription cleared" });
  } catch (e) {
    next(e);
  }
});

// Subscribe to Pro or VIP
router.post("/billing/subscribe", authenticate, async (req, res, next) => {
  try {
    const { plan, successUrl, cancelUrl } = req.body;
    if (!["pro", "vip"].includes(plan)) throw createError(400, "Invalid plan");

    // Sync subscription status first to ensure we have the latest data
    if (req.user.stripeCustomerId) {
      const stripeService = require("../services/StripeService");
      const stripe = stripeService.rawStripe();
      
      // Check for any active or trialing subscriptions
      const activeSubs = await stripe.subscriptions.list({
        customer: req.user.stripeCustomerId,
        status: 'active',
        limit: 5
      });
      
      const trialingSubs = await stripe.subscriptions.list({
        customer: req.user.stripeCustomerId,
        status: 'trialing',
        limit: 5
      });
      
      if (activeSubs.data.length > 0 || trialingSubs.data.length > 0) {
        throw createError(400, "You already have an active subscription. Please cancel your current subscription first or use the billing portal to modify it.");
      }
      
      // Also clear any incomplete subscriptions
      await clearIncompleteSubscriptions(req.user.stripeCustomerId);
    }

    const result = await subscribeUser(req.user, plan, successUrl, cancelUrl);

    res.json({
      message: `Starting checkout for ${plan.toUpperCase()} plan`,
      url: result.url,
    });
  } catch (e) {
    next(e);
  }
});

// Cancel at period end
router.post("/billing/cancel", authenticate, async (req, res, next) => {
  try {
    if (!req.user.stripeCustomerId)
      throw createError(400, "No Stripe customer");
    const updated = await cancelSubscriptionAtPeriodEnd(
      req.user.stripeCustomerId
    );
    await SystemEvent.create({
      user_id: req.user.id,
      type: "billing.cancel",
      metadata: { updated },
    });
    res.json({ message: "Subscription will cancel at period end", updated });
  } catch (e) {
    next(e);
  }
});

// Cancel immediately with brand match cleanup
router.post("/billing/cancel-now", authenticate, async (req, res, next) => {
  try {
    if (!req.user.stripeCustomerId)
      throw createError(400, "No Stripe customer");
    
    const result = await cancelSubscriptionImmediately(
      req.user.stripeCustomerId
    );
    
    await SystemEvent.create({
      user_id: req.user.id,
      type: "billing.cancel_immediate",
      metadata: { 
        cancelledSub: result.cancelledSub?.id,
        deletedMatches: result.deletedMatches
      },
    });
    
    res.json({ 
      message: "Subscription cancelled immediately", 
      deletedMatches: result.deletedMatches,
      result 
    });
  } catch (e) {
    next(e);
  }
});

// Get current subscription info
router.get("/billing/subscription", authenticate, async (req, res, next) => {
  try {
    // First try to sync from Stripe if we have a customer ID
    if (req.user.stripeCustomerId) {
      try {
        const stripeService = require("../services/StripeService");
        const stripe = stripeService.rawStripe();
        
        // Get active subscriptions from Stripe
        const subs = await stripe.subscriptions.list({
          customer: req.user.stripeCustomerId,
          limit: 1,
          status: 'all'
        });
        
        if (subs.data.length > 0) {
          const stripeSub = subs.data[0];
          
          // Update user based on latest Stripe data
          if (stripeSub.status === 'canceled' || stripeSub.status === 'incomplete_expired' || stripeSub.status === 'unpaid') {
            req.user.plan = 'free';
            req.user.subscriptionStatus = stripeSub.status;
            req.user.prioritySupport = false;
          } else if (stripeSub.status === 'active' || stripeSub.status === 'trialing') {
            const priceId = stripeSub.items.data[0]?.price?.id;
            if (priceId === process.env.STRIPE_PRICE_PRO) {
              req.user.plan = 'pro';
              req.user.prioritySupport = false;
            } else if (priceId === process.env.STRIPE_PRICE_VIP) {
              req.user.plan = 'vip';
              req.user.prioritySupport = true;
            }
            req.user.subscriptionStatus = stripeSub.status;
          }
          
          await req.user.save();
        }
      } catch (error) {
        console.error('Error syncing subscription from Stripe:', error);
      }
    }

    const subscription = await Subscription.findOne({
      where: { user_id: req.user.id },
      order: [['createdAt', 'DESC']]
    });

    if (!subscription) {
      return res.json({
        plan: req.user.plan || 'free',
        status: req.user.subscriptionStatus || 'inactive',
        cancelAtPeriodEnd: false
      });
    }

    // Check if subscription is set to cancel at period end
    let cancelAtPeriodEnd = false;
    if (req.user.stripeCustomerId && subscription.stripeSubscriptionId) {
      try {
        const stripeService = require("../services/StripeService");
        const stripe = stripeService.rawStripe();
        const stripeSub = await stripe.subscriptions.retrieve(subscription.stripeSubscriptionId);
        cancelAtPeriodEnd = stripeSub.cancel_at_period_end;
      } catch (error) {
        console.error('Error checking Stripe subscription:', error);
      }
    }

    res.json({
      plan: req.user.plan, // Use the user's current plan
      status: req.user.subscriptionStatus, // Use the user's current status
      currentPeriodEnd: subscription.currentPeriodEnd,
      cancelAtPeriodEnd
    });
  } catch (e) {
    next(e);
  }
});

// Sync subscription status from Stripe
router.post("/billing/sync", authenticate, async (req, res, next) => {
  try {
    if (!req.user.stripeCustomerId) {
      return res.json({ message: "No Stripe customer ID found" });
    }

    const stripeService = require("../services/StripeService");
    const stripe = stripeService.rawStripe();
    
    // Get active subscriptions from Stripe
    const subs = await stripe.subscriptions.list({
      customer: req.user.stripeCustomerId,
      limit: 10
    });
    
    let updated = false;
    
    if (subs.data.length === 0) {
      // No active subscriptions, set to free
      if (req.user.plan !== 'free') {
        req.user.plan = 'free';
        req.user.subscriptionStatus = 'inactive';
        req.user.prioritySupport = false;
        await req.user.save();
        updated = true;
      }
    } else {
      // Process the most recent active subscription
      const activeSub = subs.data.find(sub => sub.status === 'active') || subs.data[0];
      
      if (activeSub.status === 'canceled' || activeSub.status === 'incomplete_expired' || activeSub.status === 'unpaid') {
        req.user.plan = 'free';
        req.user.subscriptionStatus = activeSub.status;
        req.user.prioritySupport = false;
        updated = true;
      } else if (activeSub.status === 'active' || activeSub.status === 'trialing') {
        const priceId = activeSub.items.data[0]?.price?.id;
        if (priceId === process.env.STRIPE_PRICE_PRO) {
          req.user.plan = 'pro';
          req.user.prioritySupport = false;
        } else if (priceId === process.env.STRIPE_PRICE_VIP) {
          req.user.plan = 'vip';
          req.user.prioritySupport = true;
        }
        req.user.subscriptionStatus = activeSub.status;
        updated = true;
      }
      
      if (updated) {
        await req.user.save();
        
        // Update or create subscription record
        await Subscription.upsert({
          user_id: req.user.id,
          stripeCustomerId: req.user.stripeCustomerId,
          stripeSubscriptionId: activeSub.id,
          stripePriceId: activeSub.items.data[0]?.price?.id,
          plan: req.user.plan,
          status: activeSub.status,
          currentPeriodEnd: activeSub.current_period_end ? new Date(activeSub.current_period_end * 1000) : null,
        });
      }
    }
    
    res.json({
      message: updated ? "Subscription synced successfully" : "Subscription already up to date",
      plan: req.user.plan,
      status: req.user.subscriptionStatus
    });
  } catch (e) {
    next(e);
  }
});

// Billing portal
router.post("/billing/portal", authenticate, async (req, res, next) => {
  try {
    const { returnUrl } = req.body;
    const url = await billingPortalSession(req.user, returnUrl || `${app.url}/settings`);
    res.json({ url });
  } catch (e) {
    next(e);
  }
});

module.exports = router;