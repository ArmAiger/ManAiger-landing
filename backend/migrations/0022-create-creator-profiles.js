'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('creator_profiles', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4,
        allowNull: false
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        unique: true
      },
      
      // Location & Language
      country: {
        type: Sequelize.STRING(100), // Full country name
        allowNull: false
      },
      timezone: {
        type: Sequelize.STRING(50), // e.g., "America/New_York"
        allowNull: false
      },
      primary_language: {
        type: Sequelize.JSON, // Array of language codes ["en", "es"]
        allowNull: false
      },
      content_languages: {
        type: Sequelize.JSON, // Array of language codes (optional)
        allowNull: true
      },
      
      // Platform Data
      primary_platforms: {
        type: Sequelize.JSON, // Array: ["tiktok", "instagram", "youtube", "twitch", "other"]
        allowNull: false
      },
      audience_sizes: {
        type: Sequelize.JSON, // Object: { "tiktok": "10k-50k", "instagram": "5k-25k" }
        allowNull: false
      },
      average_views: {
        type: Sequelize.JSON, // Object: { "tiktok": "1k-5k", "instagram": "500-2k" }
        allowNull: false
      },
      
      // Content & Interests
      top_niches: {
        type: Sequelize.JSON, // Array of max 3: ["gaming", "fitness", "lifestyle"]
        allowNull: false
      },
      brand_categories: {
        type: Sequelize.JSON, // Array: ["apparel", "supplements", "saas", "wellness"]
        allowNull: false
      },
      
      // Deal Preferences
      deal_types: {
        type: Sequelize.JSON, // Array: ["flat_fee", "affiliate", "gifted", "rev_share", "ugc_only"]
        allowNull: false
      },
      minimum_rates: {
        type: Sequelize.JSON, // Object: { "tiktok": 500, "instagram": 300, "youtube": 1000 }
        allowNull: true
      },
      preferred_currency: {
        type: Sequelize.STRING(3), // ISO currency code (USD, EUR, GBP, etc.)
        allowNull: false,
        defaultValue: 'USD'
      },
      
      // International Preferences
      accepts_international_brands: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      shipping_preferences: {
        type: Sequelize.ENUM('digital_only', 'domestic_shipping', 'international_shipping'),
        allowNull: false,
        defaultValue: 'international_shipping'
      },
      
      // Company/Tax Info (optional initially)
      company_name: {
        type: Sequelize.STRING,
        allowNull: true
      },
      tax_id: {
        type: Sequelize.STRING,
        allowNull: true
      },
      billing_address: {
        type: Sequelize.JSON, // Object with address fields
        allowNull: true
      },
      
      // Status
      onboarding_completed: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      
      // Timestamps
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // Add indexes
    await queryInterface.addIndex('creator_profiles', ['user_id']);
    await queryInterface.addIndex('creator_profiles', ['country']);
    await queryInterface.addIndex('creator_profiles', ['onboarding_completed']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('creator_profiles');
  }
};
