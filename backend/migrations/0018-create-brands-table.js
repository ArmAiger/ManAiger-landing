"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('brands', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.literal("gen_random_uuid()"),
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      website: {
        type: Sequelize.STRING,
        allowNull: true
      },
      industry: {
        type: Sequelize.STRING,
        allowNull: true
      },
      category: {
        type: Sequelize.STRING,
        allowNull: true
      },
      tags: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        allowNull: true,
        defaultValue: []
      },
      social_media: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: {}
      },
      contact_info: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: {}
      },
      company_size: {
        type: Sequelize.ENUM('startup', 'small', 'medium', 'large', 'enterprise'),
        allowNull: true
      },
      location: {
        type: Sequelize.STRING,
        allowNull: true
      },
      target_audience: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      brand_values: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      collaboration_history: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: []
      },
      average_campaign_budget: {
        type: Sequelize.STRING,
        allowNull: true
      },
      preferred_content_types: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        allowNull: true,
        defaultValue: []
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      last_updated: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('now')
      },
      source: {
        type: Sequelize.STRING,
        allowNull: true
      },
      logo_url: {
        type: Sequelize.STRING,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('now')
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('now')
      }
    });

    // Add indexes
    await queryInterface.addIndex('brands', ['name']);
    await queryInterface.addIndex('brands', ['industry']);
    await queryInterface.addIndex('brands', ['category']);
    await queryInterface.addIndex('brands', ['is_active']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('brands');
    await queryInterface.sequelize.query(`DROP TYPE IF EXISTS "enum_brands_company_size";`);
  }
};
