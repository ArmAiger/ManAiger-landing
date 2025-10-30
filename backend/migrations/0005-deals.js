"use strict";
module.exports = {
  async up(q, S) {
    await q.createTable("deals", {
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
      brand_name: S.STRING,
      deliverables: S.JSONB,
      amount: S.DECIMAL,
      status: {
        type: S.ENUM("draft", "proposed", "active", "completed", "cancelled"),
        defaultValue: "draft",
      },
      due_dates: S.JSONB,
      created_at: { type: S.DATE, defaultValue: S.fn("now") },
      updated_at: { type: S.DATE, defaultValue: S.fn("now") },
    });
  },
  async down(q) {
    await q.dropTable("deals");
    await q.sequelize.query(`DROP TYPE IF EXISTS
"enum_deals_status";`);
  },
};
