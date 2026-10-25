"use strict";

/** @typedef {import('sequelize').Sequelize} Sequelize */

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("users", {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: Sequelize.literal("gen_random_uuid()"),
      },
      email: { type: Sequelize.STRING(320), allowNull: false },
      username: { type: Sequelize.STRING(50), allowNull: false },
      password_hash: { type: Sequelize.STRING(255), allowNull: false },
      role: {
        type: Sequelize.ENUM("CUSTOMER", "PUBLISHER", "ADMIN", "SUPPORT"),
        allowNull: false,
        defaultValue: "CUSTOMER",
      },
      country_code: { type: Sequelize.STRING(2), allowNull: true },
      birth_date: { type: Sequelize.DATE, allowNull: true },
      status: {
        type: Sequelize.ENUM("ACTIVE", "SUSPENDED", "DELETED"),
        allowNull: false,
        defaultValue: "ACTIVE",
      },
      email_verified_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("NOW()") },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("NOW()") },
    });

    // Case-insensitive uniqueness for email and username.
    await queryInterface.addIndex("users", [Sequelize.fn("lower", Sequelize.col("email"))], {
      name: "users_email_ci_unique",
      unique: true,
    });
    await queryInterface.addIndex("users", [Sequelize.fn("lower", Sequelize.col("username"))], {
      name: "users_username_ci_unique",
      unique: true,
    });
    await queryInterface.addIndex("users", ["status"], { name: "users_status_idx" });

    await queryInterface.sequelize.query(
      `CREATE TRIGGER users_updated_at BEFORE UPDATE ON "users" FOR EACH ROW EXECUTE FUNCTION set_updated_at();`,
    );
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`DROP TRIGGER IF EXISTS users_updated_at ON "users";`);
    await queryInterface.dropTable("users");
  },
};
