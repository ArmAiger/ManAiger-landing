const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const bodyParser = require("body-parser");
const session = require("express-session");
const passport = require("./config/passport");
const errorHandler = require("./middleware/error");
const { app: appCfg } = require("./config");
const authRoutes = require("./routes/auth");
const meRoutes = require("./routes/me");
const billingRoutes = require("./routes/billing");
const stripeWebhook = require("./routes/stripeWebhook");
const invoiceRoutes = require("./routes/invoices");
const brandMatchRoutes = require("./routes/brandMatches");
const analyticsRoutes = require("./routes/analytics");
const briefingRoutes = require("./routes/briefing");
const youtubeRoutes = require("./routes/youtube");
const twitchRoutes = require("./routes/twitch");
const nicheRoutes = require("./routes/userNiches");
const nichesRoutes = require("./routes/niches");
const brandsRoutes = require("./routes/brands");
const aiRoutes = require("./routes/ai");
const dashboardRoutes = require("./routes/dashboard");
const rewardfulRoutes = require("./routes/rewardful");
const dealsRoutes = require("./routes/deals");
const creatorOnboardingRoutes = require("./routes/creator-onboarding");
const gmailRoutes = require("./routes/gmail");

const app = express();

// Trust proxy for production (to detect HTTPS correctly)
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Stripe webhook requires raw body - mount first
app.use("/api", stripeWebhook);

// Standard middlewares
app.use(helmet());
app.use(cors({ credentials: true }));
app.use(morgan("dev"));
app.use(bodyParser.json({ limit: "1mb" }));

// Session middleware for passport
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-session-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Session and passport middleware for Google OAuth
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-session-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: process.env.NODE_ENV === 'production' }
}));
app.use(passport.initialize());
app.use(passport.session());

app.use("/api/auth", authRoutes);
app.use("/api", meRoutes);
app.use("/api", billingRoutes);
app.use("/api", invoiceRoutes);
app.use("/api", brandMatchRoutes);
app.use("/api", analyticsRoutes);
app.use("/api", briefingRoutes);
app.use("/api" , youtubeRoutes);
app.use("/api", twitchRoutes);
app.use("/api", aiRoutes);
app.use("/api", nicheRoutes);
app.use("/api", nichesRoutes);
app.use("/api", brandsRoutes);
app.use("/api", dashboardRoutes);
app.use("/api", rewardfulRoutes);
app.use("/api", dealsRoutes);
app.use("/api", creatorOnboardingRoutes);
app.use("/api", gmailRoutes);

app.use(errorHandler);

module.exports = app;
