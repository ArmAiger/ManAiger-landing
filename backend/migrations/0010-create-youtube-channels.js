'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('youtube_channels', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
      },
      channel_id: { type: Sequelize.STRING, unique: true, allowNull: false },
      channel_name: { type: Sequelize.STRING },
      access_token: { type: Sequelize.TEXT, allowNull: false }, // Encrypted
      refresh_token: { type: Sequelize.TEXT, allowNull: false }, // Encrypted
      token_expires_at: { type: Sequelize.DATE, allowNull: false },
      created_at: { allowNull: false, type: Sequelize.DATE },
      updated_at: { allowNull: false, type: Sequelize.DATE },
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('youtube_channels');
  },
};