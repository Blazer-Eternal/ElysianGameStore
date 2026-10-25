"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("sessions", {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: Sequelize.literal("gen_random_uuid()"),
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "users", key: "id" },
        onDelete: "CASCADE",
      },
      refresh_token_hash: { type: Sequelize.STRING(64), allowNull: false },
      user_agent: { type: Sequelize.STRING(255), allowNull: true },
      ip: { type: Sequelize.STRING(64), allowNull: true },
      expires_at: { type: Sequelize.DATE, allowNull: false },
      revoked_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("NOW()") },
    });

    await queryInterface.addIndex("sessions", ["user_id"], { name: "sessions_user_id_idx" });
    await queryInterface.addIndex("sessions", ["refresh_token_hash"], {
      name: "sessions_refresh_token_hash_unique",
      unique: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("sessions");
  },
};
