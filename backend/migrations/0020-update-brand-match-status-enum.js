"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // Add new values to the existing enum
    await queryInterface.sequelize.query(
      `ALTER TYPE "enum_brand_matches_status" ADD VALUE IF NOT EXISTS 'contacted';`
    );
    await queryInterface.sequelize.query(
      `ALTER TYPE "enum_brand_matches_status" ADD VALUE IF NOT EXISTS 'interested';`
    );
    await queryInterface.sequelize.query(
      `ALTER TYPE "enum_brand_matches_status" ADD VALUE IF NOT EXISTS 'completed';`
    );
  },
};
