require("dotenv").config();
module.exports = {
  app: {
    env: process.env.NODE_ENV || "development",
    url: process.env.APP_URL || "http://localhost:4000",
    port: process.env.PORT || 4000,
    corsOrigin: process.env.CORS_ORIGIN || "*",
    cryptoSecret: process.env.CRYPTO_SECRET,
  },
  db: {
    url: process.env.DATABASE_URL,
  },
  auth: {
    jwtSecret: process.env.JWT_SECRET,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || "15m",
    refreshSecret: process.env.REFRESH_JWT_SECRET,
    refreshExpiresIn: process.env.REFRESH_JWT_EXPIRES_IN || "7d",
  },
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    priceStarter: process.env.STRIPE_PRICE_STARTER,
    pricePro: process.env.STRIPE_PRICE_PRO,
    priceVip: process.env.STRIPE_PRICE_VIP,
  },
  gmail: {
    clientId: process.env.GMAIL_CLIENT_ID,
    clientSecret: process.env.GMAIL_CLIENT_SECRET,
  },
  youtube: {
    clientId: process.env.YOUTUBE_CLIENT_ID,
    clientSecret: process.env.YOUTUBE_CLIENT_SECRET,
  },
  openai: {
    key: process.env.OPENAI_API_KEY,
  },
  twitch: {
    clientId: process.env.TWITCH_CLIENT_ID,
    clientSecret: process.env.TWITCH_CLIENT_SECRET,
    redirectUri: process.env.TWITCH_REDIRECT_URI,
  },
};
