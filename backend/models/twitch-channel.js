'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class TwitchChannel extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      TwitchChannel.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user'
      });
    }
  }
  TwitchChannel.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    channel_id: { type: DataTypes.STRING, unique: true, allowNull: false },
    channel_name: { type: DataTypes.STRING },
    access_token: { type: DataTypes.TEXT, allowNull: false }, // Encrypted
    refresh_token: { type: DataTypes.TEXT, allowNull: false }, // Encrypted
    token_expires_at: { type: DataTypes.DATE, allowNull: false },
  }, {
    sequelize,
    modelName: 'TwitchChannel',
    tableName: 'twitch_channels',
    underscored: true,
  });
  return TwitchChannel;
};