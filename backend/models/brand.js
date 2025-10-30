'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Brand extends Model {
    static associate(models) {
      // A Brand can have many BrandMatches
      Brand.hasMany(models.BrandMatch, {
        foreignKey: 'brand_id',
        as: 'matches'
      });
      
      // A Brand can have many Deals
      Brand.hasMany(models.Deal, {
        foreignKey: 'brand_id',
        as: 'deals'
      });
    }
  }
  Brand.init({
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
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    website: {
      type: DataTypes.STRING,
      allowNull: true
    },
    industry: {
      type: DataTypes.STRING,
      allowNull: true
    },
    category: {
      type: DataTypes.STRING,
      allowNull: true
    },
    tags: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: true,
      defaultValue: []
    },
    socialMedia: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {},
      comment: 'JSON object containing social media links: {instagram: "", twitter: "", tiktok: "", youtube: ""}'
    },
    contactInfo: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {},
      comment: 'JSON object containing contact information: {email: "", phone: "", contactPerson: ""}'
    },
    companySize: {
      type: DataTypes.ENUM('startup', 'small', 'medium', 'large', 'enterprise'),
      allowNull: true
    },
    location: {
      type: DataTypes.STRING,
      allowNull: true
    },
    targetAudience: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    brandValues: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    collaborationHistory: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
      comment: 'Array of previous collaborations'
    },
    averageCampaignBudget: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Budget range like "$1,000-$5,000" or "Negotiable"'
    },
    preferredContentTypes: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: true,
      defaultValue: [],
      comment: 'Types like ["Instagram Posts", "YouTube Videos", "TikTok Videos"]'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    lastUpdated: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    source: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Where this brand information was sourced from'
    },
    logoUrl: {
      type: DataTypes.STRING,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'Brand',
    tableName: 'brands',
    underscored: true,
    timestamps: true,
    indexes: [
      {
        fields: ['name']
      },
      {
        fields: ['industry']
      },
      {
        fields: ['category']
      },
      {
        fields: ['is_active']
      }
    ]
  });
  return Brand;
};
