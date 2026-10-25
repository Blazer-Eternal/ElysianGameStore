"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("coupons", {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: Sequelize.literal("gen_random_uuid()"),
      },
      code: { type: Sequelize.STRING(40), allowNull: false, unique: true },
      discount_type: { type: Sequelize.ENUM("PERCENT", "FIXED"), allowNull: false },
      value: { type: Sequelize.INTEGER, allowNull: false },
      max_uses: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
      used_count: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      per_user_limit: { type: Sequelize.INTEGER, allowNull: true },
      min_order_paisa: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      expires_at: { type: Sequelize.DATE, allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("NOW()") },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("NOW()") },
    });

    // Defense in depth on top of the atomic conditional UPDATE used at
    // checkout: a coupon can never be over-redeemed even by raw SQL.
    await queryInterface.sequelize.query(
      `ALTER TABLE coupons ADD CONSTRAINT coupons_used_lte_max CHECK (used_count <= max_uses);`,
    );
    await queryInterface.addIndex("coupons", ["code"], {
      name: "code_unique",
      unique: true,
    });
    await queryInterface.sequelize.query(
      `CREATE TRIGGER coupons_updated_at BEFORE UPDATE ON "coupons" FOR EACH ROW EXECUTE FUNCTION set_updated_at();`,
    );
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`DROP TRIGGER IF EXISTS coupons_updated_at ON "coupons";`);
    await queryInterface.dropTable("coupons");
  },
};
