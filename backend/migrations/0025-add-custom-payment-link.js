"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('invoices', 'custom_payment_link', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'Creator\'s own payment link (Stripe, PayPal, etc.)'
    });

    await queryInterface.addColumn('invoices', 'payment_method_type', {
      type: Sequelize.ENUM('STRIPE_ADMIN', 'CUSTOM_LINK'),
      allowNull: false,
      defaultValue: 'STRIPE_ADMIN',
      comment: 'Whether payment goes through admin Stripe or custom link'
    });

    await queryInterface.addColumn('invoices', 'custom_payment_instructions', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'Instructions for brands when using custom payment links'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('invoices', 'custom_payment_link');
    await queryInterface.removeColumn('invoices', 'payment_method_type');
    await queryInterface.removeColumn('invoices', 'custom_payment_instructions');
    
    // Drop the ENUM type
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_invoices_payment_method_type";');
  }
};
