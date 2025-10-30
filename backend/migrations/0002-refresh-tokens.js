"use strict";
module.exports = {
  async up(q, S) {
    await q.createTable("refresh_tokens", {
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
      token_hash: { type: S.STRING, allowNull: false },
      expires_at: { type: S.DATE, allowNull: false },
      revoked: { type: S.BOOLEAN, defaultValue: false },
      created_at: { type: S.DATE, defaultValue: S.fn("now") },
      updated_at: { type: S.DATE, defaultValue: S.fn("now") },
    });
  },
  async down(q) {
    await q.dropTable("refresh_tokens");
  },
};
