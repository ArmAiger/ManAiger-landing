const express = require("express");
const { authenticate } = require("../middleware/auth");
const { User } = require("../db/sequelize");
const router = express.Router();

router.get("/", authenticate, async (req, res) => {
  const { id, email, name, plan, subscriptionStatus, prioritySupport } =
    req.user;
  res.json({ id, email, name, plan, subscriptionStatus, prioritySupport });
});

router.get("/user", authenticate, async (req, res) => {
  const { id, email, name, plan, subscriptionStatus, prioritySupport } =
    req.user;
  res.json({ id, email, name, plan, subscriptionStatus, prioritySupport });
});

router.patch("/", authenticate, async (req, res) => {
  const { name } = req.body;
  if (typeof name === "string") req.user.name = name;
  await req.user.save();
  res.json({
    message: "Profile updated",
    user: { id: req.user.id, name: req.user.name },
  });
});

// Get user plan info with usage statistics
router.get("/me/plan-usage", authenticate, async (req, res, next) => {
  try {
    const { Op } = require("sequelize");
    const { BrandMatch } = require("../db/sequelize");
    
    // Get plan limits
    const getBrandMatchLimit = (plan) => {
      switch (plan) {
        case 'free': return 3;
        case 'pro': return 15;
        case 'vip': return null; // Unlimited
        default: return 3;
      }
    };
    
    const limit = getBrandMatchLimit(req.user.plan);
    
    // Calculate current month usage
    const start = new Date();
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setMonth(end.getMonth() + 1, 0);
    end.setHours(23, 59, 59, 999);
    
    const monthlyUsage = await BrandMatch.count({
      where: { 
        userId: req.user.id, 
        createdAt: { [Op.between]: [start, end] }
      },
    });
    
    const remaining = limit === null ? null : Math.max(0, limit - monthlyUsage);
    
    res.json({
      plan: req.user.plan,
      monthlyLimit: limit,
      monthlyUsage,
      remaining,
      subscriptionStatus: req.user.subscriptionStatus,
      periodStart: start.toISOString(),
      periodEnd: end.toISOString()
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
