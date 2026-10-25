"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("games", {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: Sequelize.literal("gen_random_uuid()"),
      },
      publisher_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "publishers", key: "id" },
        onDelete: "RESTRICT",
      },
      title: { type: Sequelize.STRING(160), allowNull: false },
      slug: { type: Sequelize.STRING(180), allowNull: false, unique: true },
      short_desc: { type: Sequelize.STRING(500), allowNull: false },
      long_desc: { type: Sequelize.TEXT, allowNull: true },
      release_date: { type: Sequelize.DATE, allowNull: true },
      age_rating: {
        type: Sequelize.ENUM("E", "T", "M", "AO"),
        allowNull: false,
        defaultValue: "E",
      },
      base_price_paisa: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      currency: { type: Sequelize.STRING(3), allowNull: false, defaultValue: "NPR" },
      status: {
        type: Sequelize.ENUM("DRAFT", "IN_REVIEW", "PUBLISHED", "DELISTED"),
        allowNull: false,
        defaultValue: "DRAFT",
      },
      is_early_access: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      published_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("NOW()") },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("NOW()") },
    });

    await queryInterface.sequelize.query(
      `ALTER TABLE games ADD CONSTRAINT games_base_price_nonneg CHECK (base_price_paisa >= 0);`,
    );
    await queryInterface.addIndex("games", ["publisher_id"], { name: "games_publisher_id_idx" });
    await queryInterface.addIndex("games", ["status"], { name: "games_status_idx" });
    await queryInterface.addIndex("games", ["release_date"], { name: "games_release_date_idx" });

    // Postgres full-text search: weighted vector over title / short / long
    // descriptions with a GIN index. Browse & search (gameRepository.search)
    // query it with plainto_tsquery + ts_rank.
    await queryInterface.sequelize.query(`
      ALTER TABLE games ADD COLUMN search_vector tsvector
      GENERATED ALWAYS AS (
        setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(short_desc, '')), 'B') ||
        setweight(to_tsvector('english', coalesce(long_desc, '')), 'C')
      ) STORED;
    `);
    await queryInterface.sequelize.query(
      `CREATE INDEX games_search_idx ON games USING GIN (search_vector);`,
    );

    await queryInterface.sequelize.query(
      `CREATE TRIGGER games_updated_at BEFORE UPDATE ON "games" FOR EACH ROW EXECUTE FUNCTION set_updated_at();`,
    );
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`DROP TRIGGER IF EXISTS games_updated_at ON "games";`);
    await queryInterface.dropTable("games");
  },
};
