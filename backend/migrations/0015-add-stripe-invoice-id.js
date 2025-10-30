"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("invoices", "stripe_invoice_id", {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await queryInterface.addColumn("invoices", "description", {
      type: Sequelize.TEXT,
      allowNull: true,
    });

    await queryInterface.addColumn("invoices", "invoice_number", {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("invoices", "stripe_invoice_id");
    await queryInterface.removeColumn("invoices", "description");
    await queryInterface.removeColumn("invoices", "invoice_number");
  },
};
