const clearPendingSubscription = async (user) => {
  // Update user's subscription status to null or inactive
  user.subscriptionStatus = null;
  await user.save();

  // If there's an incomplete subscription in Stripe, cancel it
  if (user.stripeCustomerId) {
    const subscriptions = await stripe.subscriptions.list({
      customer: user.stripeCustomerId,
      status: 'incomplete',
      limit: 1,
    });

    if (subscriptions.data.length > 0) {
      await stripe.subscriptions.cancel(subscriptions.data[0].id);
    }
  }
};

// Add this to module.exports
module.exports = {
  ...require('./StripeService'), // Keep existing exports
  clearPendingSubscription,
};
