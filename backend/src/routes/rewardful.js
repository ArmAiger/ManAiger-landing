const express = require("express");
const { authenticate } = require("../middleware/auth");
const RewardfulService = require("../services/RewardfulService");
const router = express.Router();

// Track conversion - called from frontend after successful payment
router.post("/rewardful/conversion", authenticate, async (req, res, next) => {
  try {
    const { email, plan, amount } = req.body;
    
    if (!email || !plan || !amount) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Track conversion with basic user data
    // Note: This may still fail if user didn't come via affiliate link
    const result = await RewardfulService.trackConversion({
      email,
      external_id: req.user.id.toString(),
      amount,
      currency: 'USD',
      metadata: {
        plan: plan,
        user_id: req.user.id,
        source: 'frontend_success_page'
      }
    });

    if (result) {
      console.log(`Rewardful conversion tracked for user ${req.user.id} (${email}) - ${plan} plan`);
      res.json({ success: true, message: 'Conversion tracked successfully' });
    } else {
      console.log(`Rewardful conversion tracking failed for user ${req.user.id} (${email}) - may not have referral context`);
      res.json({ success: false, message: 'Conversion tracking failed - user may not have come via affiliate link' });
    }
  } catch (error) {
    console.error('Rewardful conversion endpoint error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
