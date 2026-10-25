"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("orders", {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: Sequelize.literal("gen_random_uuid()"),
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "users", key: "id" },
        onDelete: "RESTRICT", // orders must survive account soft-deletes
      },
      status: {
        type: Sequelize.ENUM("PENDING", "PAID", "FAILED", "REFUNDED", "PARTIAL_REFUND"),
        allowNull: false,
        defaultValue: "PENDING",
      },
      subtotal_paisa: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      discount_paisa: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      tax_paisa: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      total_paisa: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      currency: { type: Sequelize.STRING(3), allowNull: false, defaultValue: "NPR" },
      coupon_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "coupons", key: "id" },
        onDelete: "SET NULL",
      },
      paid_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("NOW()") },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("NOW()") },
    });

    // The pricing formula is enforced by the database itself.
    await queryInterface.sequelize.query(
      `ALTER TABLE orders ADD CONSTRAINT orders_total_formula CHECK (total_paisa = subtotal_paisa - discount_paisa + tax_paisa);`,
    );
    await queryInterface.addIndex("orders", ["user_id", "created_at"], { name: "orders_user_created_idx" });
    await queryInterface.addIndex("orders", ["status"], { name: "orders_status_idx" });
    await queryInterface.sequelize.query(
      `CREATE TRIGGER orders_updated_at BEFORE UPDATE ON "orders" FOR EACH ROW EXECUTE FUNCTION set_updated_at();`,
    );

    await queryInterface.createTable("order_items", {
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
      game_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "games", key: "id" },
        onDelete: "RESTRICT",
      },
      unit_price_paisa: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      promotion_discount_paisa: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      coupon_discount_paisa: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      discount_paisa: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      tax_paisa: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      publisher_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "publishers", key: "id" },
        onDelete: "RESTRICT",
      },
      revenue_share_pct: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 70 },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("NOW()") },
    });

    await queryInterface.sequelize.query(
      `ALTER TABLE order_items ADD CONSTRAINT order_items_discount_split CHECK (discount_paisa = promotion_discount_paisa + coupon_discount_paisa);`,
    );
    await queryInterface.addIndex("order_items", ["order_id"], { name: "order_items_order_id_idx" });
    await queryInterface.addIndex("order_items", ["game_id"], { name: "order_items_game_id_idx" });
    await queryInterface.addIndex("order_items", ["publisher_id"], { name: "order_items_publisher_id_idx" });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("order_items");
    await queryInterface.sequelize.query(`DROP TRIGGER IF EXISTS orders_updated_at ON "orders";`);
    await queryInterface.dropTable("orders");
  },
};
