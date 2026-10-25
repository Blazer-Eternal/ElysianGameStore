"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("payments", {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: Sequelize.literal("gen_random_uuid()"),
      },
      order_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "orders", key: "id" },
        onDelete: "CASCADE",
      },
      provider: {
        type: Sequelize.ENUM("ESEWA", "KHALTI", "CONNECTIPS", "IMEPAY"),
        allowNull: false,
      },
      provider_txn_id: { type: Sequelize.STRING(120), allowNull: true, unique: true },
      idempotency_key: { type: Sequelize.STRING(120), allowNull: true, unique: true },
      status: {
        type: Sequelize.ENUM("INITIATED", "PENDING", "PAID", "FAILED", "REFUNDED"),
        allowNull: false,
        defaultValue: "INITIATED",
      },
      amount_paisa: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      raw_response: { type: Sequelize.JSONB, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("NOW()") },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("NOW()") },
    });

    // provider_txn_id unique == webhook idempotency (replays collapse onto one
    // row); idempotency_key unique == initiate idempotency.
    await queryInterface.addIndex("payments", ["order_id"], { name: "payments_order_id_idx" });
    await queryInterface.sequelize.query(
      `CREATE TRIGGER payments_updated_at BEFORE UPDATE ON "payments" FOR EACH ROW EXECUTE FUNCTION set_updated_at();`,
    );
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`DROP TRIGGER IF EXISTS payments_updated_at ON "payments";`);
    await queryInterface.dropTable("payments");
  },
};
