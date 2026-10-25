"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("gifts", {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: Sequelize.literal("gen_random_uuid()"),
      },
      sender_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "users", key: "id" },
        onDelete: "RESTRICT",
      },
      recipient_email: { type: Sequelize.STRING(320), allowNull: false },
      game_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "games", key: "id" },
        onDelete: "RESTRICT",
      },
      order_item_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "order_items", key: "id" },
        onDelete: "SET NULL",
        unique: true,
      },
      status: {
        type: Sequelize.ENUM("PENDING", "REDEEMED", "EXPIRED", "CANCELLED"),
        allowNull: false,
        defaultValue: "PENDING",
      },
      redeem_token: { type: Sequelize.STRING(64), allowNull: false, unique: true },
      expires_at: { type: Sequelize.DATE, allowNull: false },
      redeemed_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "users", key: "id" },
        onDelete: "SET NULL",
      },
      redeemed_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("NOW()") },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("NOW()") },
    });

    await queryInterface.addIndex("gifts", ["recipient_email", "status"], {
      name: "gifts_recipient_status_idx",
    });
    await queryInterface.sequelize.query(
      `CREATE TRIGGER gifts_updated_at BEFORE UPDATE ON "gifts" FOR EACH ROW EXECUTE FUNCTION set_updated_at();`,
    );
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`DROP TRIGGER IF EXISTS gifts_updated_at ON "gifts";`);
    await queryInterface.dropTable("gifts");
  },
};
