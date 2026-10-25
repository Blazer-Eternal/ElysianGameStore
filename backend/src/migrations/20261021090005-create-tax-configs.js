"use strict";

// VAT lives in the database, never hard-coded. The row with the latest
// effective_from (<= now) wins — see pricingServices.getEffectiveTaxConfig.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("tax_configs", {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: Sequelize.literal("gen_random_uuid()"),
      },
      name: { type: Sequelize.STRING(60), allowNull: false, defaultValue: "VAT" },
      rate_bps: { type: Sequelize.INTEGER, allowNull: false },
      effective_from: { type: Sequelize.DATE, allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("NOW()") },
    });

    await queryInterface.addIndex("tax_configs", ["effective_from"], {
      name: "tax_configs_effective_from_idx",
    });
    await queryInterface.sequelize.query(
      `ALTER TABLE tax_configs ADD CONSTRAINT tax_configs_rate_bps_nonneg CHECK (rate_bps >= 0);`,
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable("tax_configs");
  },
};
