"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("refunds", {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: Sequelize.literal("gen_random_uuid()"),
      },
      order_item_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "order_items", key: "id" },
        onDelete: "RESTRICT",
        unique: true, // one refund per order item
      },
      reason: { type: Sequelize.STRING(500), allowNull: false },
      amount_paisa: { type: Sequelize.INTEGER, allowNull: false },
      status: {
        type: Sequelize.ENUM("PENDING", "APPROVED", "REJECTED"),
        allowNull: false,
        defaultValue: "PENDING",
      },
      requested_at: { type: Sequelize.DATE, allowNull: false },
      decided_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "users", key: "id" },
        onDelete: "SET NULL",
      },
      decided_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("NOW()") },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("NOW()") },
    });

    await queryInterface.addIndex("refunds", ["status"], { name: "refunds_status_idx" });
    await queryInterface.sequelize.query(
      `CREATE TRIGGER refunds_updated_at BEFORE UPDATE ON "refunds" FOR EACH ROW EXECUTE FUNCTION set_updated_at();`,
    );
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`DROP TRIGGER IF EXISTS refunds_updated_at ON "refunds";`);
    await queryInterface.dropTable("refunds");
  },
};
