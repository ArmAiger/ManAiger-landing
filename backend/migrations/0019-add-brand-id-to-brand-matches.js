"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // Add brand_id column to brand_matches table
    await queryInterface.addColumn('brand_matches', 'brand_id', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'brands',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    // Add index for brand_id
    await queryInterface.addIndex('brand_matches', ['brand_id']);
  },

  async down(queryInterface, Sequelize) {
    // Remove the brand_id column
    await queryInterface.removeColumn('brand_matches', 'brand_id');
  }
};
