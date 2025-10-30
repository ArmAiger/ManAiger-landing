const express = require("express");
const router = express.Router();

// Manual conversion tracking endpoint for testing
router.post("/manual-conversion", async (req, res) => {
  try {
    const { email, amount, plan, affiliateToken } = req.body;
    
    console.log('Manual conversion tracking request:', {
      email,
      amount,
      plan,
      affiliateToken
    });

    // For now, just log the conversion - you can manually add it to Rewardful dashboard
    console.log(`MANUAL CONVERSION TO ADD TO REWARDFUL:`);
    console.log(`- Email: ${email}`);
    console.log(`- Amount: $${amount/100}`);
    console.log(`- Plan: ${plan}`);
    console.log(`- Affiliate: ${affiliateToken}`);
    
    res.json({ 
      success: true, 
      message: 'Conversion logged - manually add to Rewardful dashboard',
      data: { email, amount, plan, affiliateToken }
    });
  } catch (error) {
    console.error('Manual conversion error:', error);
    res.status(500).json({ error: 'Failed to log conversion' });
  }
});

module.exports = router;
