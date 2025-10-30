'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('brand_matches', 'deal_type', {
      type: Sequelize.STRING,
      allowNull: true
    });

    await queryInterface.addColumn('brand_matches', 'estimated_rate', {
      type: Sequelize.STRING,
      allowNull: true
    });

    await queryInterface.addColumn('brand_matches', 'brand_country', {
      type: Sequelize.STRING,
      allowNull: true
    });

    await queryInterface.addColumn('brand_matches', 'requires_shipping', {
      type: Sequelize.BOOLEAN,
      allowNull: true
    });

    await queryInterface.addColumn('brand_matches', 'brand_website', {
      type: Sequelize.STRING,
      allowNull: true
    });

    await queryInterface.addColumn('brand_matches', 'brand_email', {
      type: Sequelize.STRING,
      allowNull: true
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('brand_matches', 'deal_type');
    await queryInterface.removeColumn('brand_matches', 'estimated_rate');
    await queryInterface.removeColumn('brand_matches', 'brand_country');
    await queryInterface.removeColumn('brand_matches', 'requires_shipping');
    await queryInterface.removeColumn('brand_matches', 'brand_website');
    await queryInterface.removeColumn('brand_matches', 'brand_email');
  }
};
