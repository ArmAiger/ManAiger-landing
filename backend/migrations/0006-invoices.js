"use strict";
module.exports = {
  async up(q, S) {
    await q.createTable("invoices", {
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
      deal_id: {
        type: S.UUID,
        references: { model: "deals", key: "id" },
        onDelete: "SET NULL",
      },
      amount: S.DECIMAL,
      currency: { type: S.STRING, defaultValue: "usd" },
      status: {
        type: S.ENUM("unpaid", "paid", "void", "refunded"),
        defaultValue: "unpaid",
      },
      stripe_checkout_session_id: S.STRING,
      paid_at: S.DATE,
      created_at: { type: S.DATE, defaultValue: S.fn("now") },
      updated_at: { type: S.DATE, defaultValue: S.fn("now") },
    });
  },
  async down(q) {
    await q.dropTable("invoices");
    await q.sequelize.query(`DROP TYPE IF EXISTS
"enum_invoices_status";`);
  },
};
