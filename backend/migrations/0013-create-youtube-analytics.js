'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Create youtube_analytics table
    await queryInterface.createTable('youtube_analytics', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      subscriber_count: {
        type: Sequelize.BIGINT,
        allowNull: false
      },
      view_count: {
        type: Sequelize.BIGINT,
        allowNull: false
      },
      video_count: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      recorded_at: {
        type: Sequelize.DATE,
        allowNull: false
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Create youtube_video_analytics table
    await queryInterface.createTable('youtube_video_analytics', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      video_id: {
        type: Sequelize.STRING,
        allowNull: false
      },
      title: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      published_at: {
        type: Sequelize.DATE,
        allowNull: false
      },
      views: {
        type: Sequelize.BIGINT,
        allowNull: false
      },
      likes: {
        type: Sequelize.BIGINT,
        allowNull: false
      },
      comments: {
        type: Sequelize.BIGINT,
        allowNull: false
      },
      recorded_at: {
        type: Sequelize.DATE,
        allowNull: false
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Add unique constraint for user_id, video_id, recorded_at
    await queryInterface.addIndex('youtube_video_analytics', {
      fields: ['user_id', 'video_id', 'recorded_at'],
      unique: true,
      name: 'unique_user_video_recorded_at'
    });

    // Add indexes for better query performance
    await queryInterface.addIndex('youtube_analytics', {
      fields: ['user_id', 'recorded_at'],
      name: 'idx_youtube_analytics_user_recorded'
    });

    await queryInterface.addIndex('youtube_video_analytics', {
      fields: ['user_id', 'recorded_at'],
      name: 'idx_youtube_video_analytics_user_recorded'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('youtube_video_analytics');
    await queryInterface.dropTable('youtube_analytics');
  }
};
