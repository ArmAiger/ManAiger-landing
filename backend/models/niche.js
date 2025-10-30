'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Niche extends Model {
    static associate(models) {
      // Many-to-many with User
      Niche.belongsToMany(models.User, {
        through: 'UserNiches',
        as: 'users',
        foreignKey: 'niche_id',
        otherKey: 'user_id'
      });
    }
  }
  Niche.init({
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    }
  }, {
    sequelize,
    modelName: 'Niche',
  });
  return Niche;
};
