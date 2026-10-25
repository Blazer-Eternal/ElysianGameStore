"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("publishers", {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: Sequelize.literal("gen_random_uuid()"),
      },
      name: { type: Sequelize.STRING(120), allowNull: false },
      legal_name: { type: Sequelize.STRING(160), allowNull: false },
      tax_id: { type: Sequelize.STRING(60), allowNull: true }, // PAN/VAT
      payout_account: { type: Sequelize.STRING(120), allowNull: true },
      payout_currency: {
        type: Sequelize.ENUM("NPR", "USD"),
        allowNull: false,
        defaultValue: "NPR",
      },
      revenue_share_pct: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 70 },
      status: {
        type: Sequelize.ENUM("UNVERIFIED", "VERIFIED", "SUSPENDED"),
        allowNull: false,
        defaultValue: "UNVERIFIED",
      },
      owner_user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "users", key: "id" },
        onDelete: "RESTRICT",
      },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("NOW()") },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("NOW()") },
    });

    await queryInterface.addIndex("publishers", ["owner_user_id"], {
      name: "publishers_owner_user_id_unique",
      unique: true,
    });
    await queryInterface.addIndex("publishers", ["status"], { name: "publishers_status_idx" });
    await queryInterface.sequelize.query(
      `ALTER TABLE publishers ADD CONSTRAINT publishers_revenue_share_pct_range CHECK (revenue_share_pct >= 0 AND revenue_share_pct <= 100);`,
    );
    await queryInterface.sequelize.query(
      `CREATE TRIGGER publishers_updated_at BEFORE UPDATE ON "publishers" FOR EACH ROW EXECUTE FUNCTION set_updated_at();`,
    );
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`DROP TRIGGER IF EXISTS publishers_updated_at ON "publishers";`);
    await queryInterface.dropTable("publishers");
  },
};
