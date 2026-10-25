"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("game_genres", {
      game_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "games", key: "id" },
        onDelete: "CASCADE",
        primaryKey: true,
      },
      genre_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "genres", key: "id" },
        onDelete: "CASCADE",
        primaryKey: true,
      },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("NOW()") },
    });

    await queryInterface.createTable("game_tags", {
      game_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "games", key: "id" },
        onDelete: "CASCADE",
        primaryKey: true,
      },
      tag_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "tags", key: "id" },
        onDelete: "CASCADE",
        primaryKey: true,
      },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("NOW()") },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("game_tags");
    await queryInterface.dropTable("game_genres");
  },
};
