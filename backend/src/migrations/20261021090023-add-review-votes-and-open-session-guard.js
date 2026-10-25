"use strict";

// Two integrity guarantees that previously existed only in application code:
//
// 1. review_helpful_votes — one (review, voter) pair. POST /reviews/:id/helpful
//    used to increment helpful_count on every call, so a single user could pad
//    any review. The insert into this table is now the idempotency gate: the
//    counter only moves when the vote row is actually created.
//
// 2. play_sessions_one_open_idx — at most one OPEN session (ended_at IS NULL)
//    per (user, game). The service already closes stale opens before starting,
//    but only under an application-level check; this partial unique index
//    makes double-counting playtime impossible even under a race.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("review_helpful_votes", {
      review_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "reviews", key: "id" },
        onDelete: "CASCADE",
        primaryKey: true,
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "users", key: "id" },
        onDelete: "CASCADE",
        primaryKey: true,
      },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("NOW()") },
    });

    await queryInterface.addIndex("review_helpful_votes", ["user_id"], {
      name: "review_helpful_votes_user_idx",
    });

    // Partial unique index: one open session per user per game.
    await queryInterface.sequelize.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS play_sessions_one_open_idx
         ON play_sessions (user_id, game_id) WHERE ended_at IS NULL`,
    );
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      "DROP INDEX IF EXISTS play_sessions_one_open_idx",
    );
    await queryInterface.dropTable("review_helpful_votes");
  },
};
