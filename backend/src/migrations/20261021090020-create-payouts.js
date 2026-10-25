"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("payouts", {
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
      period_start: { type: Sequelize.DATE, allowNull: false },
      period_end: { type: Sequelize.DATE, allowNull: false },
      gross_paisa: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      refunds_paisa: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      commission_paisa: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      net_paisa: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      payout_currency: {
        type: Sequelize.ENUM("NPR", "USD"),
        allowNull: false,
        defaultValue: "NPR",
      },
      fx_rate_snapshot: { type: Sequelize.FLOAT, allowNull: true },
      status: {
        type: Sequelize.ENUM("PENDING", "PAID", "CANCELLED"),
        allowNull: false,
        defaultValue: "PENDING",
      },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("NOW()") },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("NOW()") },
    });

    // One payout per publisher per period.
    await queryInterface.addIndex("payouts", ["publisher_id", "period_start", "period_end"], {
      name: "payouts_publisher_period_unique",
      unique: true,
    });
    await queryInterface.addIndex("payouts", ["status"], { name: "payouts_status_idx" });
    await queryInterface.sequelize.query(
      `CREATE TRIGGER payouts_updated_at BEFORE UPDATE ON "payouts" FOR EACH ROW EXECUTE FUNCTION set_updated_at();`,
    );
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`DROP TRIGGER IF EXISTS payouts_updated_at ON "payouts";`);
    await queryInterface.dropTable("payouts");
  },
};
