'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // First, remove any default value to avoid casting issues
    await queryInterface.sequelize.query(`
      ALTER TABLE deals ALTER COLUMN status DROP DEFAULT;
    `);

    // Then change status column to text to avoid enum issues
    await queryInterface.sequelize.query(`
      ALTER TABLE deals ALTER COLUMN status TYPE text;
    `);

    // Drop the old enum
    await queryInterface.sequelize.query(`DROP TYPE IF EXISTS "enum_deals_status";`);

    // Create new enum type
    await queryInterface.sequelize.query(`
      CREATE TYPE "enum_deals_status" AS ENUM (
        'PROSPECT', 'OUTREACH_SENT', 'NEGOTIATION', 
        'AGREEMENT_LOCKED', 'INVOICED', 'PAID', 'DECLINED'
      );
    `);

    // Update existing data to map to new enum values
    await queryInterface.sequelize.query(`
      UPDATE deals 
      SET status = CASE 
        WHEN status = 'draft' THEN 'PROSPECT'
        WHEN status = 'proposed' THEN 'OUTREACH_SENT'
        WHEN status = 'active' THEN 'NEGOTIATION'
        WHEN status = 'completed' THEN 'PAID'
        WHEN status = 'cancelled' THEN 'DECLINED'
        ELSE 'PROSPECT'
      END;
    `);

    // Change column to use new enum
    await queryInterface.sequelize.query(`
      ALTER TABLE deals 
      ALTER COLUMN status TYPE "enum_deals_status" 
      USING status::"enum_deals_status";
    `);

    // Add default value back
    await queryInterface.sequelize.query(`
      ALTER TABLE deals 
      ALTER COLUMN status SET DEFAULT 'PROSPECT'::"enum_deals_status";
    `);

    // Check if user_id column exists, if not skip the rename
    let tableInfo = await queryInterface.describeTable('deals');
    if (tableInfo.user_id) {
      // Rename user_id to creator_id for consistency
      await queryInterface.renameColumn('deals', 'user_id', 'creator_id');
    } else if (!tableInfo.creator_id) {
      // If neither exists, add creator_id column
      await queryInterface.addColumn('deals', 'creator_id', {
        type: Sequelize.UUID,
        allowNull: true, // Allow null initially for existing records
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      });
    }

    // Add new columns to existing deals table (check if they exist first)
    tableInfo = await queryInterface.describeTable('deals');
    
    if (!tableInfo.brand_id) {
      await queryInterface.addColumn('deals', 'brand_id', {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'brands',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      });
    }

    if (!tableInfo.title) {
      await queryInterface.addColumn('deals', 'title', {
        type: Sequelize.STRING,
        allowNull: true, // Allow null initially, will be required in code
      });
    }

    if (!tableInfo.proposed_amount) {
      await queryInterface.addColumn('deals', 'proposed_amount', {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      });
    }

    if (!tableInfo.agreed_amount) {
      await queryInterface.addColumn('deals', 'agreed_amount', {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      });
    }

    // Add new timestamp columns
    if (!tableInfo.outreach_sent_at) {
      await queryInterface.addColumn('deals', 'outreach_sent_at', {
        type: Sequelize.DATE,
        allowNull: true,
      });
    }

    if (!tableInfo.negotiation_started_at) {
      await queryInterface.addColumn('deals', 'negotiation_started_at', {
        type: Sequelize.DATE,
        allowNull: true,
      });
    }

    if (!tableInfo.agreement_locked_at) {
      await queryInterface.addColumn('deals', 'agreement_locked_at', {
        type: Sequelize.DATE,
        allowNull: true,
      });
    }

    if (!tableInfo.invoiced_at) {
      await queryInterface.addColumn('deals', 'invoiced_at', {
        type: Sequelize.DATE,
        allowNull: true,
      });
    }

    if (!tableInfo.paid_at) {
      await queryInterface.addColumn('deals', 'paid_at', {
        type: Sequelize.DATE,
        allowNull: true,
      });
    }

    if (!tableInfo.closed_at) {
      await queryInterface.addColumn('deals', 'closed_at', {
        type: Sequelize.DATE,
        allowNull: true,
      });
    }

    // Add new JSON/text columns
    if (!tableInfo.terms_snapshot) {
      await queryInterface.addColumn('deals', 'terms_snapshot', {
        type: Sequelize.JSONB,
        allowNull: true,
      });
    }

    if (!tableInfo.lost_reason) {
      await queryInterface.addColumn('deals', 'lost_reason', {
        type: Sequelize.TEXT,
        allowNull: true,
      });
    }

    if (!tableInfo.invoice_id) {
      await queryInterface.addColumn('deals', 'invoice_id', {
        type: Sequelize.UUID,
        allowNull: true,
      });
    }

    // Create conversation_logs table
    await queryInterface.createTable('conversation_logs', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      deal_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'deals',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      channel: {
        type: Sequelize.ENUM('EMAIL', 'IG_DM', 'X_DM', 'DISCORD', 'OTHER'),
        allowNull: false,
      },
      direction: {
        type: Sequelize.ENUM('OUTBOUND', 'INBOUND'),
        allowNull: false,
      },
      timestamp: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      summary: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      disposition: {
        type: Sequelize.ENUM('NO_REPLY', 'INTERESTED', 'DECLINED', 'NEEDS_INFO', 'COUNTER'),
        allowNull: false,
      },
      amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      },
      terms_delta: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      attachments: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    // Create deal_activities table
    await queryInterface.createTable('deal_activities', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      deal_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'deals',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      type: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      message: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      actor: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      metadata: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    // Add indexes for performance
    await queryInterface.addIndex('deals', ['creator_id']);
    await queryInterface.addIndex('deals', ['status']);
    await queryInterface.addIndex('deals', ['created_at']);
    await queryInterface.addIndex('conversation_logs', ['deal_id']);
    await queryInterface.addIndex('deal_activities', ['deal_id']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('deal_activities');
    await queryInterface.dropTable('conversation_logs');
    
    // Revert deals table changes (simplified rollback)
    await queryInterface.removeColumn('deals', 'brand_id');
    await queryInterface.removeColumn('deals', 'title');
    await queryInterface.removeColumn('deals', 'proposed_amount');
    await queryInterface.removeColumn('deals', 'agreed_amount');
    await queryInterface.removeColumn('deals', 'outreach_sent_at');
    await queryInterface.removeColumn('deals', 'negotiation_started_at');
    await queryInterface.removeColumn('deals', 'agreement_locked_at');
    await queryInterface.removeColumn('deals', 'invoiced_at');
    await queryInterface.removeColumn('deals', 'paid_at');
    await queryInterface.removeColumn('deals', 'closed_at');
    await queryInterface.removeColumn('deals', 'terms_snapshot');
    await queryInterface.removeColumn('deals', 'lost_reason');
    await queryInterface.removeColumn('deals', 'invoice_id');
    
    // Rename creator_id back to user_id
    await queryInterface.renameColumn('deals', 'creator_id', 'user_id');
    
    // Restore old enum - convert to text first
    await queryInterface.sequelize.query(`
      ALTER TABLE deals ALTER COLUMN status TYPE text;
    `);

    await queryInterface.sequelize.query(`DROP TYPE IF EXISTS "enum_deals_status";`);
    
    await queryInterface.sequelize.query(`
      CREATE TYPE "enum_deals_status" AS ENUM ('draft', 'proposed', 'active', 'completed', 'cancelled');
    `);

    // Map values back to old enum
    await queryInterface.sequelize.query(`
      UPDATE deals 
      SET status = CASE 
        WHEN status = 'PROSPECT' THEN 'draft'
        WHEN status = 'OUTREACH_SENT' THEN 'proposed'
        WHEN status = 'NEGOTIATION' THEN 'active'
        WHEN status = 'PAID' THEN 'completed'
        WHEN status = 'DECLINED' THEN 'cancelled'
        ELSE 'draft'
      END;
    `);
    
    await queryInterface.sequelize.query(`
      ALTER TABLE deals 
      ALTER COLUMN status TYPE "enum_deals_status" 
      USING status::"enum_deals_status";
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE deals 
      ALTER COLUMN status SET DEFAULT 'draft'::"enum_deals_status";
    `);
  }
};
