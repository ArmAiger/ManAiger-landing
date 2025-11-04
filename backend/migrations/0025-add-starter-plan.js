"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // Extend enum types to include 'starter'
    // Users.plan
    await queryInterface.sequelize.query(`ALTER TYPE "enum_users_plan" ADD VALUE IF NOT EXISTS 'starter';`);

    // Subscriptions.plan
    await queryInterface.sequelize.query(`ALTER TYPE "enum_subscriptions_plan" ADD VALUE IF NOT EXISTS 'starter';`);
  },
  async down() {
    // PostgreSQL cannot easily remove enum values safely; leaving no-op down.
    return Promise.resolve();
  },
};


