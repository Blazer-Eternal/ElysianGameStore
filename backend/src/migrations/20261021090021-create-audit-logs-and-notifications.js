"use strict";

// audit_logs (append-only) + notifications (wishlist-driven sale alerts etc.)
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("audit_logs", {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: Sequelize.literal("gen_random_uuid()"),
      },
      actor_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "users", key: "id" },
        onDelete: "SET NULL",
      },
      action: { type: Sequelize.STRING(80), allowNull: false },
      entity: { type: Sequelize.STRING(60), allowNull: false },
      entity_id: { type: Sequelize.STRING(64), allowNull: false },
      diff: { type: Sequelize.JSONB, allowNull: true },
      ip: { type: Sequelize.STRING(64), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("NOW()") },
    });

    await queryInterface.addIndex("audit_logs", ["entity", "entity_id"], {
      name: "audit_logs_entity_idx",
    });
    await queryInterface.addIndex("audit_logs", ["created_at"], { name: "audit_logs_created_idx" });

    await queryInterface.createTable("notifications", {
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
        onDelete: "CASCADE",
      },
      type: {
        type: Sequelize.ENUM("PROMOTION", "ORDER", "REFUND", "GIFT", "PAYOUT", "SYSTEM"),
        allowNull: false,
        defaultValue: "SYSTEM",
      },
      title: { type: Sequelize.STRING(160), allowNull: false },
      body: { type: Sequelize.STRING(500), allowNull: true },
      data: { type: Sequelize.JSONB, allowNull: true },
      read_at: { type: Sequelize.DATE, allowNull: true },
      converted_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("NOW()") },
    });

    await queryInterface.addIndex("notifications", ["user_id", "created_at"], {
      name: "notifications_user_created_idx",
    });
    await queryInterface.addIndex("notifications", ["type", "converted_at"], {
      name: "notifications_conversion_idx",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("notifications");
    await queryInterface.dropTable("audit_logs");
  },
};
