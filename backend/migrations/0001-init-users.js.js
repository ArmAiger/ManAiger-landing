"use strict";
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("users", {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.literal("gen_random_uuid()"),
      },
      email: { type: Sequelize.STRING, allowNull: false, unique: true },
      name: { type: Sequelize.STRING },
      password_hash: { type: Sequelize.TEXT },
      google_id: { type: Sequelize.STRING },
      role: { type: Sequelize.ENUM("user", "admin"), defaultValue: "user" },
      plan: {
        type: Sequelize.ENUM("free", "pro", "vip"),
        defaultValue: "free",
      },
      subscription_status: { type: Sequelize.STRING, defaultValue: "inactive" },
      stripe_customer_id: { type: Sequelize.STRING },
      priority_support: { type: Sequelize.BOOLEAN, defaultValue: false },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.fn("now") },
      updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.fn("now") },
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable("users");
    await queryInterface.sequelize.query(`DROP TYPE IF EXISTS
"enum_users_role";`);
    await queryInterface.sequelize.query(`DROP TYPE IF EXISTS
"enum_users_plan";`);
  },
};
