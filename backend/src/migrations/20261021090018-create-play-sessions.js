"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("play_sessions", {
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
      game_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "games", key: "id" },
        onDelete: "CASCADE",
      },
      started_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("NOW()") },
      ended_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("NOW()") },
    });

    await queryInterface.addIndex("play_sessions", ["user_id", "game_id"], {
      name: "play_sessions_user_game_idx",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("play_sessions");
  },
};
