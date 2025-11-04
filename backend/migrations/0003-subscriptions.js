"use strict";
module.exports = {
  async up(q, S) {
    await q.createTable("subscriptions", {
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
      stripe_customer_id: S.STRING,
      stripe_price_id: S.STRING,
      plan: { type: S.ENUM("free", "starter", "pro", "vip"), defaultValue: "free" },
      status: S.STRING,
      current_period_end: S.DATE,
      trial_end: S.DATE,
      created_at: { type: S.DATE, defaultValue: S.fn("now") },
      updated_at: { type: S.DATE, defaultValue: S.fn("now") },
    });
  },
  async down(q) {
    await q.dropTable("subscriptions");
    await q.sequelize.query(`DROP TYPE IF EXISTS "enum_subscriptions_plan";`);
  },
};
