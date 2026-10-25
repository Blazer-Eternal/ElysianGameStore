"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("promotions", {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: Sequelize.literal("gen_random_uuid()"),
      },
      name: { type: Sequelize.STRING(120), allowNull: false },
      type: { type: Sequelize.ENUM("PERCENT", "FIXED", "BUNDLE"), allowNull: false },
      value: { type: Sequelize.INTEGER, allowNull: false },
      starts_at: { type: Sequelize.DATE, allowNull: false },
      ends_at: { type: Sequelize.DATE, allowNull: false },
      funded_by: {
        type: Sequelize.ENUM("STORE", "PUBLISHER"),
        allowNull: false,
        defaultValue: "STORE",
      },
      created_by: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "users", key: "id" },
        onDelete: "RESTRICT",
      },
      notified_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("NOW()") },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("NOW()") },
    });

    await queryInterface.sequelize.query(
      `ALTER TABLE promotions ADD CONSTRAINT promotions_window CHECK (ends_at > starts_at);`,
    );
    await queryInterface.addIndex("promotions", ["starts_at", "ends_at"], {
      name: "promotions_window_idx",
    });
    await queryInterface.sequelize.query(
      `CREATE TRIGGER promotions_updated_at BEFORE UPDATE ON "promotions" FOR EACH ROW EXECUTE FUNCTION set_updated_at();`,
    );

    await queryInterface.createTable("promotion_games", {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: Sequelize.literal("gen_random_uuid()"),
      },
      promotion_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "promotions", key: "id" },
        onDelete: "CASCADE",
      },
      game_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "games", key: "id" },
        onDelete: "CASCADE",
      },
      discount_pct: { type: Sequelize.INTEGER, allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("NOW()") },
    });

    await queryInterface.addIndex("promotion_games", ["promotion_id", "game_id"], {
      name: "promotion_games_pair_unique",
      unique: true,
    });
    await queryInterface.addIndex("promotion_games", ["game_id"], {
      name: "promotion_games_game_id_idx",
    });
    await queryInterface.sequelize.query(
      `ALTER TABLE promotion_games ADD CONSTRAINT promotion_games_pct_range CHECK (discount_pct >= 1 AND discount_pct <= 90);`,
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable("promotion_games");
    await queryInterface.sequelize.query(`DROP TRIGGER IF EXISTS promotions_updated_at ON "promotions";`);
    await queryInterface.dropTable("promotions");
  },
};
