"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Describe the table to avoid throwing if columns already exist
    const tableInfo = await queryInterface.describeTable('deals');

    if (!tableInfo.created_at) {
      await queryInterface.addColumn('deals', 'created_at', {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()'),
      });
    }

    if (!tableInfo.updated_at) {
      await queryInterface.addColumn('deals', 'updated_at', {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()'),
      });
    }

    // Add index on created_at for querying by creation time if not present
    try {
      await queryInterface.addIndex('deals', ['created_at'], {
        name: 'deals_created_at_idx',
      });
    } catch (err) {
      // index might already exist; ignore
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Remove index if exists
    try {
      await queryInterface.removeIndex('deals', 'deals_created_at_idx');
    } catch (err) {
      // ignore
    }

    const tableInfo = await queryInterface.describeTable('deals');
    if (tableInfo.updated_at) {
      await queryInterface.removeColumn('deals', 'updated_at');
    }
    if (tableInfo.created_at) {
      await queryInterface.removeColumn('deals', 'created_at');
    }
  },
};
