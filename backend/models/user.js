'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      User.hasOne(models.TwitchChannel, {
        foreignKey: 'user_id',
        as: 'twitchChannel'
      });
      
      User.hasOne(models.CreatorProfile, {
        foreignKey: 'user_id',
        as: 'creatorProfile'
      });
      
      // Many-to-many with Niche
      User.belongsToMany(models.Niche, {
        through: 'UserNiches',
        as: 'niches',
        foreignKey: 'user_id',
        otherKey: 'niche_id'
      });
    }
  }
  User.init({
    name: DataTypes.STRING,
    email: DataTypes.STRING,
    password_hash: DataTypes.STRING,
    google_oauth_id: DataTypes.STRING,
    subscription_status: DataTypes.STRING,
    gmail_access_token: DataTypes.TEXT,
    gmail_refresh_token: DataTypes.TEXT,
    gmail_email: DataTypes.STRING,
    gmail_connected_at: DataTypes.DATE
  }, {
    sequelize,
    modelName: 'User',
  });
  return User;
};