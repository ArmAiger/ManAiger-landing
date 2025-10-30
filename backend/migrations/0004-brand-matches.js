"use strict";
module.exports = {
  async up(q, S) {
    await q.createTable("brand_matches", {
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
      source: S.STRING,
      brand_name: S.STRING,
      fit_reason: S.TEXT,
      outreach_draft: S.TEXT,
      status: {
        type: S.ENUM("draft", "sent", "accepted", "rejected"),
        defaultValue: "draft",
      },
      match_score: S.INTEGER,
      created_at: { type: S.DATE, defaultValue: S.fn("now") },
      updated_at: { type: S.DATE, defaultValue: S.fn("now") },
    });
  },
  async down(q) {
    await q.dropTable("brand_matches");
    await q.sequelize.query(`DROP TYPE IF EXISTS
"enum_brand_matches_status";`);
  },
};
