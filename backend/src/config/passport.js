const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { User, RefreshToken, Subscription, SystemEvent } = require('../db/sequelize');
const { signAccess, signRefresh } = require('../middleware/auth');
const { sha256 } = require('../utils/crypto');
const RewardfulService = require('../services/RewardfulService');

// Configure Google OAuth strategy
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URL || "/api/auth/google/callback"
}, async (accessToken, refreshToken, profile, done) => {
  try {
    // Check if user already exists with this Google ID
    let user = await User.findOne({
      where: { googleId: profile.id }
    });

    let isNewUser = false;

    if (user) {
      // User exists, return user with login flag
      return done(null, { ...user.toJSON(), isNewUser: false });
    }

    // Check if user exists with this email
    user = await User.findOne({
      where: { email: profile.emails[0].value }
    });

    if (user) {
      // User exists with this email but no Google ID, link the accounts
      user.googleId = profile.id;
      user.avatar = profile.photos[0]?.value;
      user.isGoogleAuth = true;
      await user.save();
      return done(null, { ...user.toJSON(), isNewUser: false });
    }

    // Create new user
    isNewUser = true;
    user = await User.create({
      googleId: profile.id,
      email: profile.emails[0].value,
      name: profile.displayName,
      avatar: profile.photos[0]?.value,
      plan: "free",
      subscriptionStatus: "inactive",
      isGoogleAuth: true
    });

    // Create subscription
    await Subscription.create({
      user_id: user.id,
      stripeCustomerId: user.stripeCustomerId,
      plan: "free",
      status: "active",
    });

    // Create system event
    await SystemEvent.create({
      user_id: user.id,
      type: "user.register",
      metadata: { 
        brand: "ManAIger",
        method: "google",
        googleId: profile.id
      },
    });

    // Track with Rewardful
    try {
      await RewardfulService.trackLead({
        email: user.email,
        external_id: user.id.toString(),
        metadata: {
          name: user.name,
          plan: user.plan,
          method: 'google'
        }
      });
    } catch (rewardfulError) {
      console.log('Rewardful tracking error (non-blocking):', rewardfulError);
    }

    return done(null, { ...user.toJSON(), isNewUser: true });
  } catch (error) {
    return done(error, null);
  }
}));

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findByPk(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

module.exports = passport;
