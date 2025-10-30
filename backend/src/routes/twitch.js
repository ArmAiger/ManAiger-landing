const express = require("express");
const jwt = require("jsonwebtoken");
const createError = require("http-errors");
const { authenticate } = require("../middleware/auth");
const {
  getAuthUrl,
  getTokens,
  getUser,
  getChannelStats,
} = require("../services/TwitchService");
const { User, TwitchChannel } = require("../db/sequelize");
const { auth: authConfig } = require("../config");
const { encrypt } = require("../utils/crypto");

const router = express.Router();

// 1. Get the auth URL for the frontend to redirect to
router.get("/twitch/auth/url", authenticate, (req, res) => {
  // We pass the user's JWT in the state parameter to securely identify them on callback
  const token = req.headers.authorization.split(" ")[1];
  const authUrl = getAuthUrl(token);
  res.json({ authUrl });
});

// 2. Handle the callback from Twitch
router.get("/twitch/auth/callback", async (req, res, next) => {
  try {
    const { code, state } = req.query;

    if (!state) {
      throw new Error("State parameter is missing from callback");
    }

    // The 'state' is the JWT we passed. Verify it to find the user.
    const decoded = jwt.verify(state, authConfig.jwtSecret);
    const user = await User.findByPk(decoded.sub);

    if (!user) {
      throw createError(401, "Invalid state token: User not found.");
    }

    const tokens = await getTokens(code);
    const twitchUser = await getUser(tokens.access_token);

    // Validate required fields
    if (!twitchUser || !twitchUser.id) {
      throw createError(400, "Could not get Twitch user info. Please try again.");
    }
    if (!tokens.access_token) {
      throw createError(400, "Missing access token from Twitch. Please try again.");
    }
    if (!tokens.refresh_token) {
      throw createError(400, "Missing refresh token from Twitch. Please remove app access from your Twitch account settings and try linking again.");
    }
    if (!tokens.expires_in) {
      throw createError(400, "Missing token expiry from Twitch. Please try again.");
    }

    const channelLink = await TwitchChannel.findOne({ where: { channel_id: twitchUser.id } });

    if (channelLink) {
      // The channel is already linked in our system.
      if (channelLink.user_id !== user.id) {
        // It's linked to a DIFFERENT user. This is a conflict.
        throw createError(409, "This Twitch channel is already linked to another account in our system.");
      }

      // It's linked to the CURRENT user. This is a re-link. Update the tokens.
      const updateData = {
        channel_id: twitchUser.id,
        channel_name: twitchUser.display_name,
        access_token: encrypt(tokens.access_token),
        token_expires_at: new Date(Date.now() + tokens.expires_in * 1000),
      };
      if (tokens.refresh_token) {
        updateData.refresh_token = encrypt(tokens.refresh_token);
      }
      await channelLink.update(updateData);
    } else {
      // This is a brand new link for this channel.
      await TwitchChannel.create({
        user_id: user.id,
        channel_id: twitchUser.id,
        channel_name: twitchUser.display_name,
        access_token: encrypt(tokens.access_token),
        refresh_token: encrypt(tokens.refresh_token),
        token_expires_at: new Date(Date.now() + tokens.expires_in * 1000),
      });
    }

    res.redirect(`${process.env.CORS_ORIGIN}/settings?twitch=success`);
  } catch (e) {
    next(e);
  }
});

// 3. Get channel stats
router.get("/twitch/stats", authenticate, async (req, res, next) => {
  try {
    const stats = await getChannelStats(req.user.id);
    res.json({ stats });
  } catch (e) {
    next(e);
  }
});

// 4. Get connected Twitch account info
router.get("/twitch/account", authenticate, async (req, res, next) => {
  try {
    const channel = await TwitchChannel.findOne({ 
      where: { user_id: req.user.id } 
    });
    
    if (!channel) {
      return res.json({ connected: false });
    }
    
    res.json({
      connected: true,
      channelId: channel.channel_id,
      channelName: channel.channel_name,
      connectedAt: channel.createdAt
    });
  } catch (e) {
    next(e);
  }
});

// 5. Disconnect Twitch account
router.delete("/twitch/disconnect", authenticate, async (req, res, next) => {
  try {
    const deleted = await TwitchChannel.destroy({
      where: { user_id: req.user.id }
    });
    
    if (deleted === 0) {
      throw createError(404, "No Twitch account connected");
    }
    
    res.json({ message: "Twitch account disconnected successfully" });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
