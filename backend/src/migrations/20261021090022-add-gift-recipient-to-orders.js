"use strict";

// Gift checkout: a single-item order flagged with a recipient email delivers
// a Gift (redeem token) at PAID time instead of a library entry.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("orders", "gift_recipient_email", {
      type: Sequelize.STRING(320),
      allowNull: true,
    });
    await queryInterface.addIndex("orders", ["gift_recipient_email"], {
      name: "orders_gift_recipient_idx",
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex("orders", "orders_gift_recipient_idx").catch(() => {});
    await queryInterface.removeColumn("orders", "gift_recipient_email");
  },
};
