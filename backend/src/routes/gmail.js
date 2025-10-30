const express = require('express');
const { authenticate } = require('../middleware/auth');
const GmailService = require('../services/GmailService');
const { User, SystemEvent, BrandMatch } = require('../db/sequelize');
const createError = require('http-errors');

const router = express.Router();

// Get Gmail authorization URL
router.get('/gmail/auth/url', authenticate, async (req, res, next) => {
  try {
    const authUrl = GmailService.getAuthUrl(req.user.id);
    res.json({ authUrl });
  } catch (error) {
    next(error);
  }
});

// Handle Gmail OAuth callback
router.get('/gmail/callback', async (req, res, next) => {
  try {
    const { code, state: userId } = req.query;

    if (!code || !userId) {
      throw createError(400, 'Missing authorization code or user ID');
    }

    // Exchange code for tokens
    const tokens = await GmailService.exchangeCodeForTokens(code);

    // Get user profile
    const profile = await GmailService.getUserProfile(tokens.access_token);

    // Check if user exists and update with Gmail tokens
    const existingUser = await User.findByPk(userId);
    if (!existingUser) {
      throw createError(404, `User with ID ${userId} not found`);
    }

    // Update user with Gmail tokens
    existingUser.gmail_access_token = tokens.access_token;
    existingUser.gmail_refresh_token = tokens.refresh_token;
    existingUser.gmail_email = profile.email;
    existingUser.gmail_connected_at = new Date();
    
    const savedUser = await existingUser.save();

    // Log system event
    await SystemEvent.create({
      user_id: userId,
      type: 'gmail.connected',
      metadata: { email: profile.email }
    });

    // Redirect to frontend with success - redirect to brands page instead of settings
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/brands?gmail=connected`);
  } catch (error) {
    console.error('Gmail callback error:', error.message);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/brands?gmail=error&message=${encodeURIComponent(error.message)}`);
  }
});

// Get Gmail connection status
router.get('/gmail/account', authenticate, async (req, res, next) => {
  try {
    // Use raw query to bypass potential model issues
    const [results] = await User.sequelize.query(
      'SELECT id, email, gmail_email, gmail_connected_at, gmail_access_token FROM users WHERE id = ?',
      {
        replacements: [req.user.id],
        type: User.sequelize.QueryTypes.SELECT
      }
    );

    if (!results) {
      return res.json({ connected: false, email: null, connectedAt: null });
    }

    const response = {
      connected: !!results.gmail_email,
      email: results.gmail_email,
      connectedAt: results.gmail_connected_at
    };

    res.json(response);
  } catch (error) {
    console.error('Gmail account endpoint error:', error);
    next(error);
  }
});

// Disconnect Gmail
router.delete('/gmail/disconnect', authenticate, async (req, res, next) => {
  try {
    await User.update({
      gmail_access_token: null,
      gmail_refresh_token: null,
      gmail_email: null,
      gmail_connected_at: null
    }, {
      where: { id: req.user.id }
    });

    await SystemEvent.create({
      user_id: req.user.id,
      type: 'gmail.disconnected',
      metadata: {}
    });

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// Send outreach email via Gmail
router.post('/gmail/send-outreach', authenticate, async (req, res, next) => {
  try {
    const { to, subject, message, matchId } = req.body;

    if (!to || !subject || !message) {
      throw createError(400, 'Missing required fields: to, subject, message');
    }

    // Get user with Gmail tokens
    const user = await User.findByPk(req.user.id, {
      attributes: ['gmail_access_token', 'gmail_refresh_token', 'gmail_email', 'email', 'name']
    });

    if (!user.gmail_access_token) {
      throw createError(400, 'Gmail not connected. Please connect your Gmail account first.');
    }

    // Send email via Gmail
    const result = await GmailService.sendEmail({
      accessToken: user.gmail_access_token,
      refreshToken: user.gmail_refresh_token,
      to,
      subject,
      message,
      replyTo: user.gmail_email
    });

    // Update brand match status if provided
    if (matchId) {
      const brandMatch = await BrandMatch.findOne({
        where: { id: matchId, userId: req.user.id }
      });

      if (brandMatch) {
        brandMatch.status = 'sent';
        await brandMatch.save();
      }
    }

    // Log system event
    await SystemEvent.create({
      user_id: req.user.id,
      type: 'gmail.outreach.sent',
      metadata: {
        to,
        subject,
        messageId: result.messageId,
        brandMatchId: matchId
      }
    });

    res.json({
      success: true,
      messageId: result.messageId,
      threadId: result.threadId
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
