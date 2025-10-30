const express = require("express");
const bcrypt = require("bcryptjs");
const createError = require("http-errors");
const jwt = require("jsonwebtoken");
const passport = require("../config/passport");
const { authLimiter } = require("../middleware/rateLimiters");
const { signAccess, signRefresh } = require("../middleware/auth");
const {
  User,
  RefreshToken,
  Subscription,
  SystemEvent,
} = require("../db/sequelize");
const { rotateRefresh } = require("../middleware/auth");
const { registerSchema, loginSchema } = require("../validators");
const { sha256 } = require("../utils/crypto");
const RewardfulService = require("../services/RewardfulService");
// const { ensureCustomer } = require("../services/StripeService");
const router = express.Router();
router.use(authLimiter);

// Signup
router.post("/register", async (req, res, next) => {
  try {
    const { value, error } = registerSchema.validate(req.body);
    if (error) throw createError(400, error.message);
    const exists = await User.findOne({ where: { email: value.email } });
    if (exists) throw createError(409, "Email already in use");
    const passwordHash = await bcrypt.hash(value.password, 10);
    const user = await User.create({
      email: value.email,
      name: value.name,
      passwordHash,
      plan: "free",
      subscriptionStatus: "inactive",
    });
    // await ensureCustomer(user);
    await Subscription.create({
      user_id: user.id,
      stripeCustomerId: user.stripeCustomerId,
      plan: "free",
      status: "active",
    });
    await SystemEvent.create({
      user_id: user.id,
      type: "user.register",
      metadata: { brand: "ManAIger" },
    });

    await RewardfulService.trackLead({
      email: user.email,
      external_id: user.id.toString(),
      metadata: {
        name: user.name,
        plan: user.plan
      }
    });
    const accessToken = signAccess(user);
    const refreshToken = signRefresh(user);
    await RefreshToken.create({
      user_id: user.id,
      tokenHash: sha256(refreshToken),
      expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000),
    });
    res.status(201).json({
      message:
        "Welcome to ManAIger — Your AI Manager for Streamers and Creators.",
      user: { id: user.id, email: user.email, name: user.name, plan: user.plan },
      accessToken,
      refreshToken,
    });
  } catch (e) {
    next(e);
  }
});

// Login
router.post("/login", async (req, res, next) => {
  try {
    const { value, error } = loginSchema.validate(req.body);
    if (error) throw createError(400, error.message);
    const user = await User.findOne({ where: { email: value.email } });
    if (!user || !user.passwordHash)
      throw createError(401, "Invalid credentials");
    const ok = await bcrypt.compare(value.password, user.passwordHash);
    if (!ok) throw createError(401, "Invalid credentials");
    const accessToken = signAccess(user);
    const refreshToken = signRefresh(user);
    await RefreshToken.create({
      user_id: user.id,
      tokenHash: sha256(refreshToken),
      expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000),
    });
    res.json({
      user: { id: user.id, email: user.email, name: user.name, plan: user.plan },
      accessToken,
      refreshToken,
    });
  } catch (e) {
    next(e);
  }
});

// Refresh
router.post("/refresh", rotateRefresh);

// Password reset (placeholders)
router.post("/forgot-password", async (req, res) => {
  // Stage 1: respond OK (email flow to be implemented later)
  res.json({
    message:
      "If your email exists, you will receive reset instructions from ManAIger.",
  });
});
router.post("/reset-password", async (req, res) => {
  res.json({ message: "Password reset not implemented in Stage 1." });
});
// Google OAuth scaffolding (placeholder endpoints)
router.get("/google", (req, res, next) => {
  console.log('Google OAuth initiation requested');
  console.log('Callback URL will be:', `${req.protocol}://${req.get('host')}/api/auth/google/callback`);
  
  passport.authenticate('google', { 
    scope: ['profile', 'email'] 
  })(req, res, next);
});

router.get("/google/callback", 
  (req, res, next) => {
    console.log('Google OAuth callback received');
    console.log('Full callback URL:', req.originalUrl);
    console.log('Host:', req.get('host'));
    console.log('Protocol:', req.protocol);
    next();
  },
  passport.authenticate('google', { session: false }),
  async (req, res) => {
    try {
      const userWithMeta = req.user;
      const { isNewUser, ...user } = userWithMeta;
      
      // Generate tokens
      const accessToken = signAccess(user);
      const refreshToken = signRefresh(user);
      
      // Store refresh token
      await RefreshToken.create({
        user_id: user.id,
        tokenHash: sha256(refreshToken),
        expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000),
      });
      
      // Send success message to parent window and close popup
      const userData = {
        id: user.id,
        email: user.email,
        name: user.name,
        plan: user.plan,
        avatar: user.avatar
      };
      
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      
      // Different message based on whether user is new or existing
      const welcomeMessage = isNewUser 
        ? `Welcome to ManAIger, ${user.name}! Account created successfully.`
        : `Welcome back, ${user.name}!`;
      
      console.log('Sending success message to frontend:', frontendUrl);
      console.log('User data:', userData);
      
      // Instead of trying postMessage, redirect to a special success page
      // that will handle the communication
      const successUrl = `${frontendUrl}/auth/callback?` + 
        `token=${encodeURIComponent(accessToken)}&` +
        `refresh=${encodeURIComponent(refreshToken)}&` +
        `user=${encodeURIComponent(JSON.stringify(userData))}&` +
        `isNew=${isNewUser}&` +
        `msg=${encodeURIComponent(welcomeMessage)}`;
      
      console.log('Redirecting to:', successUrl);
      res.redirect(successUrl);
    } catch (error) {
      console.error('Google OAuth callback error:', error);
      
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      
      // Redirect to error page with error message
      const errorUrl = `${frontendUrl}/auth/callback?error=${encodeURIComponent(error.message || 'Authentication failed')}`;
      res.redirect(errorUrl);
    }
  }
);
module.exports = router;
