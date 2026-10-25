"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("carts", {
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
        unique: true, // one cart per user
      },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("NOW()") },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("NOW()") },
    });

    await queryInterface.sequelize.query(
      `CREATE TRIGGER carts_updated_at BEFORE UPDATE ON "carts" FOR EACH ROW EXECUTE FUNCTION set_updated_at();`,
    );

    await queryInterface.createTable("cart_items", {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: Sequelize.literal("gen_random_uuid()"),
      },
      cart_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "carts", key: "id" },
        onDelete: "CASCADE",
      },
      game_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "games", key: "id" },
        onDelete: "CASCADE",
      },
      added_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("NOW()") },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("NOW()") },
    });

    await queryInterface.addIndex("cart_items", ["cart_id", "game_id"], {
      name: "cart_items_cart_game_unique",
      unique: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("cart_items");
    await queryInterface.sequelize.query(`DROP TRIGGER IF EXISTS carts_updated_at ON "carts";`);
    await queryInterface.dropTable("carts");
  },
};
