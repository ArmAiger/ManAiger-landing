const { QueryInterface, DataTypes } = require('sequelize');

module.exports = {
  async up(queryInterface, Sequelize) {
    // Check if table exists first
    const tableExists = await queryInterface.showAllTables()
      .then(tables => tables.includes('youtube_analytics'));
    
    if (!tableExists) {
      await queryInterface.createTable('youtube_analytics', {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        user_id: {
          type: DataTypes.UUID,
          allowNull: false,
          references: {
            model: 'users',
            key: 'id'
          },
          onDelete: 'CASCADE'
        },
        subscriber_count: {
          type: DataTypes.BIGINT,
          allowNull: false,
          defaultValue: 0
        },
        view_count: {
          type: DataTypes.BIGINT,
          allowNull: false,
          defaultValue: 0
        },
        video_count: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0
        },
        recorded_at: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW
        },
        created_at: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW
        },
        updated_at: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW
        }
      });

      // Add indexes for better query performance
      await queryInterface.addIndex('youtube_analytics', ['user_id']);
      await queryInterface.addIndex('youtube_analytics', ['recorded_at']);
      await queryInterface.addIndex('youtube_analytics', ['user_id', 'recorded_at']);
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('youtube_analytics');
  }
};
