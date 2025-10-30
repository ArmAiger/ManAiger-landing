'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ConversationLog extends Model {
    static associate(models) {
      ConversationLog.belongsTo(models.Deal, {
        foreignKey: 'deal_id',
        as: 'deal'
      });
    }
  }

  ConversationLog.init({
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
    },
  }, {
    sequelize,
    modelName: 'ConversationLog',
    tableName: 'conversation_logs',
    underscored: true,
  });

  return ConversationLog;
};
