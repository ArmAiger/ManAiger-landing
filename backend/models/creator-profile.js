'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class CreatorProfile extends Model {
    static associate(models) {
      CreatorProfile.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user'
      });
    }
  }

  CreatorProfile.init({
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true
    },
    
    // Location & Language
    country: {
      type: DataTypes.STRING(3),
      allowNull: false
    },
    timezone: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    primary_language: {
      type: DataTypes.JSON,
      allowNull: false
    },
    content_languages: {
      type: DataTypes.JSON,
      allowNull: true
    },
    
    // Platform Data
    primary_platforms: {
      type: DataTypes.JSON,
      allowNull: false
    },
    audience_sizes: {
      type: DataTypes.JSON,
      allowNull: false
    },
    average_views: {
      type: DataTypes.JSON,
      allowNull: false
    },
    
    // Content & Interests
    top_niches: {
      type: DataTypes.JSON,
      allowNull: false
    },
    brand_categories: {
      type: DataTypes.JSON,
      allowNull: false
    },
    
    // Deal Preferences
    deal_types: {
      type: DataTypes.JSON,
      allowNull: false
    },
    minimum_rates: {
      type: DataTypes.JSON,
      allowNull: true
    },
    preferred_currency: {
      type: DataTypes.STRING(3),
      allowNull: false,
      defaultValue: 'USD'
    },
    
    // International Preferences
    accepts_international_brands: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    shipping_preferences: {
      type: DataTypes.ENUM('digital_only', 'domestic_shipping', 'international_shipping'),
      allowNull: false,
      defaultValue: 'international_shipping'
    },
    
    // Company/Tax Info
    company_name: {
      type: DataTypes.STRING,
      allowNull: true
    },
    tax_id: {
      type: DataTypes.STRING,
      allowNull: true
    },
    billing_address: {
      type: DataTypes.JSON,
      allowNull: true
    },
    
    // Status
    onboarding_completed: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    }
  }, {
    sequelize,
    modelName: 'CreatorProfile',
    tableName: 'creator_profiles',
    underscored: true,
    timestamps: true
  });

  return CreatorProfile;
};
