'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Deal extends Model {
    static associate(models) {
      // Temporarily comment out User association to test
      // Deal.belongsTo(models.User, {
      //   foreignKey: 'creator_id',
      //   as: 'creator'
      // });
      
      Deal.belongsTo(models.Brand, {
        foreignKey: 'brand_id',
        as: 'brand'
      });

      Deal.hasMany(models.ConversationLog, {
        foreignKey: 'deal_id',
        as: 'conversations'
      });

      Deal.hasMany(models.DealActivity, {
        foreignKey: 'deal_id',
        as: 'activities'
      });

      // Deal has many invoices (one deal can have multiple invoices)
      Deal.hasMany(models.Invoice, {
        foreignKey: 'deal_id',
        as: 'invoices'
      });
    }

    // Instance method to check if transition is valid
    canTransitionTo(newStatus) {

      const validTransitions = {
        'PROSPECT': ['OUTREACH_SENT', 'DECLINED'],
        'OUTREACH_SENT': ['NEGOTIATION', 'DECLINED'],
        'NEGOTIATION': ['AGREEMENT_LOCKED', 'DECLINED'],
        'AGREEMENT_LOCKED': ['INVOICED', 'DECLINED'],
        'INVOICED': ['PAID', 'DECLINED'],
        'PAID': [],
        'DECLINED': []
      };

      const isValidTransition = validTransitions[this.status]?.includes(newStatus) || false;

      return isValidTransition;
    }

    // Get formatted response shape
    toResponseFormat() {
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
          // Support both underscored (created_at) and camelCase (createdAt) Sequelize timestamp props
          created_at: this.created_at || this.createdAt || null,
          outreach_sent_at: this.outreach_sent_at,
          negotiation_started_at: this.negotiation_started_at,
          agreement_locked_at: this.agreement_locked_at,
          invoiced_at: this.invoiced_at,
          paid_at: this.paid_at,
          closed_at: this.closed_at
        },
        // Provide top-level timestamps for callers that expect them
        created_at: this.created_at || this.createdAt || null,
        updated_at: this.updated_at || this.updatedAt || null,
        terms_snapshot: this.terms_snapshot,
        lost_reason: this.lost_reason,
        invoice_id: this.invoice_id
      };
    }
  }

  Deal.init({
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
  }, {
    sequelize,
    modelName: 'Deal',
    tableName: 'deals',
  underscored: true,
  timestamps: true,
  });

  return Deal;
};
