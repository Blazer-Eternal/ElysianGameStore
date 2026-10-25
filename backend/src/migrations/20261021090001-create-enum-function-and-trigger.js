"use strict";

// Shared pieces used by every table migration:
//  * set_updated_at() — keeps updated_at honest even for raw SQL writes.
// Enum types are created per-column by Sequelize's createTable (ENUM(...)),
// which keeps each migration self-contained and undoable.
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      CREATE OR REPLACE FUNCTION set_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`DROP FUNCTION IF EXISTS set_updated_at();`);
  },
};
