"use strict";

// library_entries (the ownership table) + game_keys (optional delivery
// channel). Revocation stamps revoked_at instead of deleting rows.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("library_entries", {
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
        onDelete: "RESTRICT",
      },
      game_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "games", key: "id" },
        onDelete: "RESTRICT",
      },
      order_item_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "order_items", key: "id" },
        onDelete: "SET NULL",
      },
      acquired_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("NOW()") },
      source: {
        type: Sequelize.ENUM("PURCHASE", "GIFT", "FREE", "KEY"),
        allowNull: false,
        defaultValue: "PURCHASE",
      },
      revoked_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("NOW()") },
    });

    await queryInterface.addIndex("library_entries", ["user_id", "game_id"], {
      name: "library_entries_user_game_unique",
      unique: true,
    });
    await queryInterface.addIndex("library_entries", ["user_id", "revoked_at"], {
      name: "library_entries_user_active_idx",
    });

    await queryInterface.createTable("game_keys", {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: Sequelize.literal("gen_random_uuid()"),
      },
      game_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "games", key: "id" },
        onDelete: "CASCADE",
      },
      key_hash: { type: Sequelize.STRING(64), allowNull: false, unique: true },
      status: {
        type: Sequelize.ENUM("AVAILABLE", "RESERVED", "REDEEMED"),
        allowNull: false,
        defaultValue: "AVAILABLE",
      },
      reserved_until: { type: Sequelize.DATE, allowNull: true },
      reserved_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "users", key: "id" },
        onDelete: "SET NULL",
      },
      redeemed_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "users", key: "id" },
        onDelete: "SET NULL",
      },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("NOW()") },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("NOW()") },
    });

    await queryInterface.addIndex("game_keys", ["game_id", "status"], {
      name: "game_keys_game_status_idx",
    });
    await queryInterface.sequelize.query(
      `CREATE TRIGGER game_keys_updated_at BEFORE UPDATE ON "game_keys" FOR EACH ROW EXECUTE FUNCTION set_updated_at();`,
    );
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`DROP TRIGGER IF EXISTS game_keys_updated_at ON "game_keys";`);
    await queryInterface.dropTable("game_keys");
    await queryInterface.dropTable("library_entries");
  },
};
