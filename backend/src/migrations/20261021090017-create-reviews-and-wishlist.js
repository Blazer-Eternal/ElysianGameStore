"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("reviews", {
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
      recommend: { type: Sequelize.BOOLEAN, allowNull: false },
      rating: { type: Sequelize.INTEGER, allowNull: true },
      body: { type: Sequelize.TEXT, allowNull: true },
      playtime_minutes: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      helpful_count: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      moderation_status: {
        type: Sequelize.ENUM("PENDING", "APPROVED", "REJECTED"),
        allowNull: false,
        defaultValue: "APPROVED",
      },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("NOW()") },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("NOW()") },
    });

    // One review per owner per game.
    await queryInterface.addIndex("reviews", ["user_id", "game_id"], {
      name: "reviews_user_game_unique",
      unique: true,
    });
    await queryInterface.addIndex("reviews", ["game_id", "moderation_status"], {
      name: "reviews_game_moderation_idx",
    });
    await queryInterface.sequelize.query(
      `ALTER TABLE reviews ADD CONSTRAINT reviews_rating_range CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5));`,
    );
    await queryInterface.sequelize.query(
      `CREATE TRIGGER reviews_updated_at BEFORE UPDATE ON "reviews" FOR EACH ROW EXECUTE FUNCTION set_updated_at();`,
    );

    await queryInterface.createTable("wishlists", {
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "users", key: "id" },
        onDelete: "CASCADE",
        primaryKey: true,
      },
      game_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "games", key: "id" },
        onDelete: "CASCADE",
        primaryKey: true,
      },
      added_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("NOW()") },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("NOW()") },
    });

    await queryInterface.addIndex("wishlists", ["game_id", "added_at"], {
      name: "wishlists_game_added_idx",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("wishlists");
    await queryInterface.sequelize.query(`DROP TRIGGER IF EXISTS reviews_updated_at ON "reviews";`);
    await queryInterface.dropTable("reviews");
  },
};
