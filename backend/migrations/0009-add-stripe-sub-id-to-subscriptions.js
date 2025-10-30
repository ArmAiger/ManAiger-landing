"use strict";
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("subscriptions", "stripe_subscription_id", {
      type: Sequelize.STRING,
      unique: true,
      allowNull: true, // Can be null if a subscription record is for something else
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("subscriptions", "stripe_subscription_id");
  },
};
