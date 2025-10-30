const { Sequelize } = require('sequelize');

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'gmail_access_token', {
      type: Sequelize.TEXT,
      allowNull: true
    });
    
    await queryInterface.addColumn('users', 'gmail_refresh_token', {
      type: Sequelize.TEXT,
      allowNull: true
    });
    
    await queryInterface.addColumn('users', 'gmail_email', {
      type: Sequelize.STRING,
      allowNull: true
    });
    
    await queryInterface.addColumn('users', 'gmail_connected_at', {
      type: Sequelize.DATE,
      allowNull: true
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('users', 'gmail_access_token');
    await queryInterface.removeColumn('users', 'gmail_refresh_token');
    await queryInterface.removeColumn('users', 'gmail_email');
    await queryInterface.removeColumn('users', 'gmail_connected_at');
  }
};
