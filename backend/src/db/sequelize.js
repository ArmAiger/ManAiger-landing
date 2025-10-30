const { Sequelize, DataTypes } = require("sequelize");
const { db } = require("../config");
const sequelize = new Sequelize(db.url, {
  logging: false,
  dialect: "postgres",
});
const TwitchChannel = require('../../models/twitch-channel')(sequelize, DataTypes);
/** MODELS **/
const User = sequelize.define(
  "User",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    email: { type: DataTypes.STRING, unique: true, allowNull: false },
    name: { type: DataTypes.STRING },
    passwordHash: { type: DataTypes.TEXT, field: 'password_hash' },
    googleId: { type: DataTypes.STRING, field: 'google_id' },
    avatar: { type: DataTypes.STRING },
    isGoogleAuth: { type: DataTypes.BOOLEAN, defaultValue: false, field: 'is_google_auth' },
    role: { type: DataTypes.ENUM("user", "admin"), defaultValue: "user" },
    plan: { type: DataTypes.ENUM("free", "pro", "vip"), defaultValue: "free" },
    subscriptionStatus: { type: DataTypes.STRING, defaultValue: "inactive", field: 'subscription_status' },
    stripeCustomerId: { type: DataTypes.STRING, field: 'stripe_customer_id' },
    prioritySupport: { type: DataTypes.BOOLEAN, defaultValue: false, field: 'priority_support' },
  },
  { tableName: "users", underscored: true }
);

const CreatorProfile = sequelize.define(
  "CreatorProfile",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: User,
        key: 'id'
      }
    },
    // Location & Language
    country: DataTypes.STRING,
    timezone: DataTypes.STRING,
    primary_language: {
      type: DataTypes.JSON,
      defaultValue: []
    },
    content_languages: {
      type: DataTypes.JSON,
      defaultValue: []
    },
    // Platform Data
    primary_platforms: {
      type: DataTypes.JSON,
      defaultValue: []
    },
    audience_sizes: {
      type: DataTypes.JSON,
      defaultValue: {}
    },
    average_views: {
      type: DataTypes.JSON,
      defaultValue: {}
    },
    // Content & Interests
    top_niches: {
      type: DataTypes.JSON,
      defaultValue: []
    },
    brand_categories: {
      type: DataTypes.JSON,
      defaultValue: []
    },
    // Deal Preferences
    deal_types: {
      type: DataTypes.JSON,
      defaultValue: []
    },
    minimum_rates: {
      type: DataTypes.JSON,
      defaultValue: {}
    },
    preferred_currency: {
      type: DataTypes.STRING,
      defaultValue: 'USD'
    },
    // International Preferences
    accepts_international_brands: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    shipping_preferences: {
      type: DataTypes.ENUM('digital_only', 'domestic_shipping', 'international_shipping'),
      defaultValue: 'international_shipping'
    },
    // Company/Tax Info (optional)
    company_name: DataTypes.STRING,
    tax_id: DataTypes.STRING,
    billing_address: DataTypes.JSON,
    // Onboarding status
    onboarding_completed: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  },
  { tableName: "creator_profiles", underscored: true }
);

const RefreshToken = sequelize.define(
  "RefreshToken",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    tokenHash: { type: DataTypes.STRING, allowNull: false },
    expiresAt: { type: DataTypes.DATE, allowNull: false },
    revoked: { type: DataTypes.BOOLEAN, defaultValue: false },
  },
  { tableName: "refresh_tokens", underscored: true }
);
const BrandMatch = sequelize.define(
  "BrandMatch",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    brandId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'brands',
        key: 'id'
      }
    },
    source: DataTypes.STRING,
    brandName: DataTypes.STRING,
    fitReason: DataTypes.TEXT,
    outreachDraft: DataTypes.TEXT,
    status: {
      type: DataTypes.ENUM('draft', 'sent', 'contacted', 'interested', 'accepted', 'rejected', 'completed'),
      defaultValue: 'draft'
    },
    matchScore: DataTypes.INTEGER,
    // Enhanced AI fields
    dealType: DataTypes.STRING,
    estimatedRate: DataTypes.STRING,
    brandCountry: DataTypes.STRING,
    requiresShipping: DataTypes.BOOLEAN,
    brandWebsite: DataTypes.STRING,
    brandEmail: DataTypes.STRING,
  },
  { 
    tableName: 'brand_matches', 
    underscored: true // This will automatically convert camelCase to snake_case
  }
);

const Brand = sequelize.define(
  "Brand",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    description: DataTypes.TEXT,
    website: DataTypes.STRING,
    industry: DataTypes.STRING,
    category: DataTypes.STRING,
    tags: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: []
    },
    socialMedia: {
      type: DataTypes.JSON,
      defaultValue: {}
    },
    contactInfo: {
      type: DataTypes.JSON,
      defaultValue: {}
    },
    companySize: {
      type: DataTypes.ENUM('startup', 'small', 'medium', 'large', 'enterprise'),
      allowNull: true
    },
    location: DataTypes.STRING,
    targetAudience: DataTypes.TEXT,
    brandValues: DataTypes.TEXT,
    collaborationHistory: {
      type: DataTypes.JSON,
      defaultValue: []
    },
    averageCampaignBudget: DataTypes.STRING,
    preferredContentTypes: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: []
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    lastUpdated: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    source: DataTypes.STRING,
    logoUrl: DataTypes.STRING
  },
  { 
    tableName: 'brands', 
    underscored: true
  }
);

const Subscription = sequelize.define(
  "Subscription",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    stripeCustomerId: DataTypes.STRING,
    stripePriceId: DataTypes.STRING,
    stripeSubscriptionId: { type: DataTypes.STRING, unique: true },
    plan: { type: DataTypes.ENUM("free", "pro", "vip"), defaultValue: "free" },
    status: DataTypes.STRING,
    currentPeriodEnd: DataTypes.DATE,
    trialEnd: DataTypes.DATE,
  },
  { tableName: "subscriptions", underscored: true }
);
// Updated Deal model to match new schema
const Deal = sequelize.define(
  "Deal",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    creator_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    brand_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM(
        'PROSPECT',
        'OUTREACH_SENT', 
        'NEGOTIATION',
        'AGREEMENT_LOCKED',
        'INVOICED',
        'PAID',
        'DECLINED'
      ),
      allowNull: false,
      defaultValue: 'PROSPECT',
    },
    proposed_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    agreed_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    outreach_sent_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    negotiation_started_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    agreement_locked_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    invoiced_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    paid_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    closed_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    terms_snapshot: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    lost_reason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    invoice_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
  },
  { 
    tableName: "deals", 
    underscored: true
  }
);

// Add instance methods to Deal prototype
Deal.prototype.canTransitionTo = function(newStatus) {
  const validTransitions = {
    'PROSPECT': ['OUTREACH_SENT', 'DECLINED'],
    'OUTREACH_SENT': ['NEGOTIATION', 'DECLINED'],
    'NEGOTIATION': ['AGREEMENT_LOCKED', 'DECLINED'],
    'AGREEMENT_LOCKED': ['INVOICED', 'DECLINED'],
    'INVOICED': ['PAID', 'DECLINED'],
    'PAID': [],
    'DECLINED': []
  };
  return validTransitions[this.status]?.includes(newStatus) || false;
};

Deal.prototype.toResponseFormat = function() {
  return {
    id: this.id,
    creator_id: this.creator_id,
    brand: this.brand ? {
      id: this.brand.id,
      name: this.brand.name,
      contact_name: this.brand.contactInfo?.contactPerson || null,
      contact_email: this.brand.contactInfo?.email || null
    } : null,
    title: this.title,
    status: this.status,
    proposed_amount: this.proposed_amount ? parseFloat(this.proposed_amount) : null,
    agreed_amount: this.agreed_amount ? parseFloat(this.agreed_amount) : null,
    dates: {
  // support both underscored and camelCase timestamp props
  created_at: this.created_at || this.createdAt || null,
      outreach_sent_at: this.outreach_sent_at,
      negotiation_started_at: this.negotiation_started_at,
      agreement_locked_at: this.agreement_locked_at,
      invoiced_at: this.invoiced_at,
      paid_at: this.paid_at,
      closed_at: this.closed_at
    },
    terms_snapshot: this.terms_snapshot,
    lost_reason: this.lost_reason,
    invoice_id: this.invoice_id
  };
};

const DealActivity = sequelize.define(
  "DealActivity",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    deal_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    type: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    actor: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
  },
  { 
    tableName: "deal_activities", 
    underscored: true 
  }
);

const ConversationLog = sequelize.define(
  "ConversationLog",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    deal_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    channel: {
      type: DataTypes.ENUM('EMAIL', 'IG_DM', 'X_DM', 'DISCORD', 'OTHER'),
      allowNull: false,
    },
    direction: {
      type: DataTypes.ENUM('OUTBOUND', 'INBOUND'),
      allowNull: false,
    },
    timestamp: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    summary: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    disposition: {
      type: DataTypes.ENUM('NO_REPLY', 'INTERESTED', 'DECLINED', 'NEEDS_INFO', 'COUNTER'),
      allowNull: false,
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    terms_delta: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    attachments: {
      type: DataTypes.JSONB,
      allowNull: true,
    }
  },
  { 
    tableName: "conversation_logs", 
    underscored: true 
  }
);

const Invoice = sequelize.define(
  "Invoice",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    brand_name: DataTypes.STRING,
    amount: DataTypes.DECIMAL,
    currency: { type: DataTypes.STRING, defaultValue: "usd" },
    status: {
      type: DataTypes.ENUM("unpaid", "paid", "void", "refunded"),
      defaultValue: "unpaid",
    },
    stripeCheckoutSessionId: DataTypes.STRING,
    stripeInvoiceId: DataTypes.STRING,
    description: DataTypes.TEXT,
    invoiceNumber: DataTypes.STRING,
    paymentUrl: DataTypes.TEXT,
    paidAt: DataTypes.DATE,
    // New fields for BYOP (Bring Your Own Payment)
    custom_payment_link: DataTypes.TEXT,
    payment_method_type: {
      type: DataTypes.ENUM("STRIPE_ADMIN", "CUSTOM_LINK"),
      defaultValue: "STRIPE_ADMIN",
    },
    custom_payment_instructions: DataTypes.TEXT,
  },
  { tableName: "invoices", underscored: true }
);
const AnalyticsSnapshot = sequelize.define(
  "AnalyticsSnapshot",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    demographics: DataTypes.JSONB,
    engagementTrends: DataTypes.JSONB,
  },
  { tableName: "analytics_snapshots", underscored: true }
);
const SystemEvent = sequelize.define(
  "SystemEvent",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    type: DataTypes.STRING,
    metadata: DataTypes.JSONB,
  },
  { tableName: "system_events", underscored: true }
);
const Niche = sequelize.define(
  "Niche",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: { type: DataTypes.STRING, unique: true, allowNull: false },
  },
  { tableName: "niches", underscored: true }
);


const YouTubeChannel = sequelize.define(
  "YouTubeChannel",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    channelId: { type: DataTypes.STRING, unique: true, allowNull: false },
    channelName: DataTypes.STRING,
    accessToken: { type: DataTypes.TEXT, allowNull: false }, // Will be encrypted
    refreshToken: { type: DataTypes.TEXT, allowNull: false }, // Will be encrypted
    tokenExpiresAt: { type: DataTypes.DATE, allowNull: false },
  },
  { tableName: "youtube_channels", underscored: true }
);

const YouTubeAnalytics = sequelize.define(
  "YouTubeAnalytics",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    subscriberCount: { type: DataTypes.BIGINT, allowNull: false },
    viewCount: { type: DataTypes.BIGINT, allowNull: false },
    videoCount: { type: DataTypes.INTEGER, allowNull: false },
    recordedAt: { type: DataTypes.DATE, allowNull: false },
  },
  { tableName: "youtube_analytics", underscored: true }
);

const YouTubeVideoAnalytics = sequelize.define(
  "YouTubeVideoAnalytics",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    videoId: { type: DataTypes.STRING, allowNull: false },
    title: { type: DataTypes.TEXT, allowNull: false },
    publishedAt: { type: DataTypes.DATE, allowNull: false },
    views: { type: DataTypes.BIGINT, allowNull: false },
    likes: { type: DataTypes.BIGINT, allowNull: false },
    comments: { type: DataTypes.BIGINT, allowNull: false },
    recordedAt: { type: DataTypes.DATE, allowNull: false },
  },
  { 
    tableName: "youtube_video_analytics", 
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['user_id', 'video_id', 'recorded_at']
      }
    ]
  }
);

/** ASSOCIATIONS **/
User.hasMany(RefreshToken, { foreignKey: "user_id" });
RefreshToken.belongsTo(User, { foreignKey: "user_id" });
User.hasOne(CreatorProfile, { foreignKey: "user_id" });
CreatorProfile.belongsTo(User, { foreignKey: "user_id" });
User.hasMany(Subscription, { foreignKey: "user_id" });
Subscription.belongsTo(User, { foreignKey: "user_id" });
User.hasMany(BrandMatch, { foreignKey: "user_id" });
BrandMatch.belongsTo(User, { foreignKey: "user_id" });
User.hasMany(Deal, { foreignKey: "creator_id" });
Deal.belongsTo(User, { foreignKey: "creator_id" });
Deal.hasMany(Invoice, { foreignKey: "deal_id", as: "invoices" });
Invoice.belongsTo(Deal, { foreignKey: "deal_id" });
Deal.hasMany(DealActivity, { foreignKey: "deal_id", as: "activities" });
DealActivity.belongsTo(Deal, { foreignKey: "deal_id", as: "deal" });
Deal.hasMany(ConversationLog, { foreignKey: "deal_id", as: "conversations" });
ConversationLog.belongsTo(Deal, { foreignKey: "deal_id", as: "deal" });
User.hasMany(Invoice, { foreignKey: "user_id" });
Invoice.belongsTo(User, { foreignKey: "user_id" });
User.hasMany(AnalyticsSnapshot, { foreignKey: "user_id" });
AnalyticsSnapshot.belongsTo(User, { foreignKey: "user_id" });
User.hasMany(SystemEvent, { foreignKey: "user_id" });
SystemEvent.belongsTo(User, { foreignKey: "user_id" });

// Brand associations
Brand.hasMany(BrandMatch, { foreignKey: "brand_id", as: "matches" });
BrandMatch.belongsTo(Brand, { foreignKey: "brand_id", as: "brand" });
Brand.hasMany(Deal, { foreignKey: "brand_id", as: "deals" });
Deal.belongsTo(Brand, { foreignKey: "brand_id", as: "brand" });

User.belongsToMany(Niche, { through: 'user_niches', foreignKey: 'user_id', otherKey: 'niche_id', as: 'niches' });
Niche.belongsToMany(User, { through: 'user_niches', foreignKey: 'niche_id', otherKey: 'user_id', as: 'users' });

User.hasOne(YouTubeChannel, { foreignKey: "user_id" });
YouTubeChannel.belongsTo(User, { foreignKey: "user_id" });
User.hasOne(TwitchChannel, { foreignKey: "user_id" });
TwitchChannel.belongsTo(User, { foreignKey: "user_id" });

User.hasMany(YouTubeAnalytics, { foreignKey: "user_id" });
YouTubeAnalytics.belongsTo(User, { foreignKey: "user_id" });
User.hasMany(YouTubeVideoAnalytics, { foreignKey: "user_id" });
YouTubeVideoAnalytics.belongsTo(User, { foreignKey: "user_id" });

module.exports = {
  sequelize,
  Sequelize,
  User,
  CreatorProfile,
  RefreshToken,
  Subscription,
  BrandMatch,
  Brand,
  Deal,
  DealActivity,
  ConversationLog,
  Invoice,
  AnalyticsSnapshot,
  SystemEvent,
  Niche,
  YouTubeChannel,
  TwitchChannel,
  YouTubeAnalytics,
  YouTubeVideoAnalytics,
};
