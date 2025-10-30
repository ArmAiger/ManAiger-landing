"use strict";
module.exports = {
  async up(q, S) {
    await q.createTable("analytics_snapshots", {
      id: {
        type: S.UUID,
        primaryKey: true,
        defaultValue: S.literal("gen_random_uuid()"),
      },
      user_id: {
        type: S.UUID,
        references: { model: "users", key: "id" },
        onDelete: "CASCADE",
      },
      demographics: S.JSONB,
      engagement_trends: S.JSONB,
      created_at: { type: S.DATE, defaultValue: S.fn("now") },
      updated_at: { type: S.DATE, defaultValue: S.fn("now") },
    });
  },
  async down(q) {
    await q.dropTable("analytics_snapshots");
  },
};
