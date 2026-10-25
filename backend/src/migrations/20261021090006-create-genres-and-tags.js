"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("genres", {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: Sequelize.literal("gen_random_uuid()"),
      },
      name: { type: Sequelize.STRING(60), allowNull: false, unique: true },
      slug: { type: Sequelize.STRING(80), allowNull: false, unique: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("NOW()") },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("NOW()") },
    });

    await queryInterface.createTable("tags", {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: Sequelize.literal("gen_random_uuid()"),
      },
      name: { type: Sequelize.STRING(60), allowNull: false, unique: true },
      slug: { type: Sequelize.STRING(80), allowNull: false, unique: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("NOW()") },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("NOW()") },
    });

    await queryInterface.sequelize.query(
      `CREATE TRIGGER genres_updated_at BEFORE UPDATE ON "genres" FOR EACH ROW EXECUTE FUNCTION set_updated_at();`,
    );
    await queryInterface.sequelize.query(
      `CREATE TRIGGER tags_updated_at BEFORE UPDATE ON "tags" FOR EACH ROW EXECUTE FUNCTION set_updated_at();`,
    );
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`DROP TRIGGER IF EXISTS tags_updated_at ON "tags";`);
    await queryInterface.sequelize.query(`DROP TRIGGER IF EXISTS genres_updated_at ON "genres";`);
    await queryInterface.dropTable("tags");
    await queryInterface.dropTable("genres");
  },
};
