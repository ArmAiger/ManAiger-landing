const express = require("express");
const { stripe: stripeConfig } = require("../config");
const { rawStripe } = require("../services/StripeService");
const { User, Subscription, Invoice, SystemEvent } = require("../db/sequelize");
const RewardfulService = require("../services/RewardfulService");
const router = express.Router();

async function handleSubscriptionChange(sub) {
  const user = await User.findOne({
    where: { stripeCustomerId: sub.customer },
  });

  if (!user) {
    console.error(`Webhook Error: No user found for customer ${sub.customer}`);
    return null;
  }

  // Determine plan by immutable Price ID
  const priceId = sub.items.data[0]?.price?.id;
  let plan = user.plan;
  if (priceId === stripeConfig.pricePro) {
    plan = "pro";
  } else if (priceId === stripeConfig.priceVip) {
    plan = "vip";
  }

  // Update User model
  user.subscriptionStatus = sub.status;
  
  // If subscription is cancelled/deleted, revert to free plan and clean up brand matches
  if (sub.status === "canceled" || sub.status === "incomplete_expired" || sub.status === "unpaid") {
    user.plan = "free";
    user.prioritySupport = false;
    
    // Clean up brand matches - keep only 3 for free plan
    const { BrandMatch } = require("../db/sequelize");
    const allBrandMatches = await BrandMatch.findAll({
      where: { userId: user.id },
      order: [['createdAt', 'DESC']]
    });

    const freeLimit = 3;
    if (allBrandMatches.length > freeLimit) {
      const matchesToDelete = allBrandMatches.slice(freeLimit);
      const idsToDelete = matchesToDelete.map(match => match.id);
      
      await BrandMatch.destroy({
        where: { id: idsToDelete }
      });
    }
  } else if (sub.status === "active" || sub.status === "trialing") {
    // Only update plan for active subscriptions
    if (plan === "vip" || plan === "pro") {
      const wasFreePlan = user.plan === "free";
      user.plan = plan;
      user.prioritySupport = plan === "vip";
      
      // Instead of manually tracking Rewardful conversions, we'll rely on:
      // 1. Rewardful webhooks to detect our conversion events, OR
      // 2. Frontend tracking when user is active on the success page
      if (wasFreePlan && sub.status === "active") {
        // User upgraded from free plan
      }
    }
  }
  await user.save();

  // Update Subscription model (find or create)
  const [subscription, created] = await Subscription.findOrCreate({
    where: { stripeSubscriptionId: sub.id },
    defaults: {
      user_id: user.id,
      stripeCustomerId: sub.customer,
      stripePriceId: sub.items.data[0]?.price?.id,
      plan: plan,
      status: sub.status,
      currentPeriodEnd: sub.current_period_end ? new Date(sub.current_period_end * 1000) : null,
    },
  });

  if (!created) {
    await subscription.update({ 
      status: sub.status, 
      plan: user.plan, // Use the user's plan (which might have been reset to free)
      stripePriceId: sub.items.data[0]?.price?.id, 
      currentPeriodEnd: sub.current_period_end ? new Date(sub.current_period_end * 1000) : null 
    });
  }
  return user;
}

// IMPORTANT: raw body for webhook verification
router.post(
  "/stripe/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const sig = req.headers["stripe-signature"];
    let event;
    try {
      event = rawStripe().webhooks.constructEvent(
        req.body,
        sig,
        stripeConfig.webhookSecret
      );
    } catch (err) {
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }
    try {
      switch (event.type) {
        case "customer.subscription.created":
        case "customer.subscription.updated":
        case "customer.subscription.deleted": {
          const sub = event.data.object;
          const user = await handleSubscriptionChange(sub);
          if (user) {
            await SystemEvent.create({
              user_id: user.id,
              type: `stripe.${event.type}`,
              metadata: { subscriptionId: sub.id },
            });
          }
          break;
        }
        case "invoice.paid": {
          const invoice = event.data.object;
          
          // Handle subscription invoice
          if (invoice.subscription) {
            const sub = await rawStripe().subscriptions.retrieve(invoice.subscription);
            const user = await handleSubscriptionChange(sub);
            if (user) {
              await SystemEvent.create({
                user_id: user.id,
                type: `stripe.${event.type}`,
                metadata: { subscriptionId: sub.id, invoiceId: invoice.id },
              });
            }
          } 
          // Handle custom invoice (brand deal invoice)
          else {
            const dbInvoice = await Invoice.findOne({
              where: {
                stripeInvoiceId: invoice.id,
              },
            });
            if (dbInvoice) {
              dbInvoice.status = "paid";
              dbInvoice.paidAt = new Date();
              dbInvoice.invoiceNumber = invoice.number;
              await dbInvoice.save();
              
              await SystemEvent.create({
                user_id: dbInvoice.user_id,
                type: "invoice.paid",
                metadata: { 
                  stripeInvoiceId: invoice.id, 
                  invoiceId: dbInvoice.id,
                  amount: invoice.amount_paid / 100 // Convert from cents
                },
              });
            }
          }
          break;
        }
        case "checkout.session.completed": {
          const session = event.data.object;
          if (session.mode === "payment") {
            const invoice = await Invoice.findOne({
              where: {
                stripeCheckoutSessionId: session.id,
              },
            });
            if (invoice) {
              invoice.status = "paid";
              invoice.paidAt = new Date();
              await invoice.save();
              await SystemEvent.create({
                user_id: invoice.user_id,
                type: "invoice.paid",
                metadata: { sessionId: session.id },
              });
            }
          }
          break;
        }
        case "invoice.payment_failed": {
          await SystemEvent.create({
            type: "stripe.invoice.payment_failed",
            metadata: { event: event.id },
          });
          break;
        }
        default:
          break;
      }
      res.json({ received: true });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Webhook handling error" });
    }
  }
);

module.exports = router;
