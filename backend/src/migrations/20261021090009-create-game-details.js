"use strict";

// GameBuild + SystemRequirement + GameMedia in one migration (all three are
// subresources of games and share its cascade).
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("game_builds", {
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
      version: { type: Sequelize.STRING(32), allowNull: false }, // semver
      platform: { type: Sequelize.ENUM("WINDOWS", "LINUX"), allowNull: false },
      file_size_bytes: { type: Sequelize.BIGINT, allowNull: false },
      checksum_sha256: { type: Sequelize.STRING(64), allowNull: false },
      cdn_url: { type: Sequelize.STRING(500), allowNull: false },
      changelog: { type: Sequelize.TEXT, allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("NOW()") },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("NOW()") },
    });

    // Unique (game, version, platform) …
    await queryInterface.addIndex(
      "game_builds",
      ["game_id", "version", "platform"],
      { name: "game_builds_game_version_platform_unique", unique: true },
    );
    // … and one active build per platform.
    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX game_builds_active_platform_unique
      ON game_builds (game_id, platform) WHERE is_active = true;
    `);
    await queryInterface.sequelize.query(
      `CREATE TRIGGER game_builds_updated_at BEFORE UPDATE ON "game_builds" FOR EACH ROW EXECUTE FUNCTION set_updated_at();`,
    );

    await queryInterface.createTable("system_requirements", {
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
      type: { type: Sequelize.ENUM("MIN", "REC"), allowNull: false },
      os: { type: Sequelize.STRING(80), allowNull: false },
      cpu: { type: Sequelize.STRING(160), allowNull: false },
      gpu: { type: Sequelize.STRING(160), allowNull: false },
      ram_gb: { type: Sequelize.INTEGER, allowNull: false },
      storage_gb: { type: Sequelize.INTEGER, allowNull: false },
      directx: { type: Sequelize.STRING(20), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("NOW()") },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("NOW()") },
    });

    await queryInterface.addIndex("system_requirements", ["game_id", "type"], {
      name: "system_requirements_game_type_unique",
      unique: true,
    });
    await queryInterface.sequelize.query(
      `CREATE TRIGGER system_requirements_updated_at BEFORE UPDATE ON "system_requirements" FOR EACH ROW EXECUTE FUNCTION set_updated_at();`,
    );

    await queryInterface.createTable("game_media", {
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
      type: { type: Sequelize.ENUM("SCREENSHOT", "TRAILER", "COVER"), allowNull: false },
      url: { type: Sequelize.STRING(500), allowNull: false },
      sort_order: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("NOW()") },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("NOW()") },
    });

    // Exactly one cover per game.
    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX game_media_one_cover_per_game
      ON game_media (game_id) WHERE type = 'COVER';
    `);
    await queryInterface.addIndex("game_media", ["game_id"], { name: "game_media_game_id_idx" });
    await queryInterface.sequelize.query(
      `CREATE TRIGGER game_media_updated_at BEFORE UPDATE ON "game_media" FOR EACH ROW EXECUTE FUNCTION set_updated_at();`,
    );
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`DROP TRIGGER IF EXISTS game_media_updated_at ON "game_media";`);
    await queryInterface.dropTable("game_media");
    await queryInterface.sequelize.query(`DROP TRIGGER IF EXISTS system_requirements_updated_at ON "system_requirements";`);
    await queryInterface.dropTable("system_requirements");
    await queryInterface.sequelize.query(`DROP TRIGGER IF EXISTS game_builds_updated_at ON "game_builds";`);
    await queryInterface.dropTable("game_builds");
  },
};
