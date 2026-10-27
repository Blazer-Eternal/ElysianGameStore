import { QueryTypes, Transaction } from "sequelize";

import { Database } from "../config";
import { MediaType } from "../enums/mediaTypeEnum";
import Game from "../models/gameModel";
import GameMedia from "../models/gameMediaModel";
import Wishlist from "../models/wishlistModel";

const { sequelize } = Database;

// Wishlist rows render as game cards, so COVER artwork is fetched with them.
const gameWithCover = {
    model: Game,
    as: "game",
    include: [
        { model: GameMedia, as: "media", where: { type: MediaType.COVER }, required: false },
    ],
};

class WishlistRepository {
    /** Idempotent add: a duplicate pair is a no-op, not an error. */
    static async add(
        userId: string,
        gameId: string,
        transaction?: Transaction,
    ): Promise<boolean> {
        // RETURNING makes "newly inserted?" deterministic: 1 row on insert,
        // 0 rows on conflict. Reading `meta.rowCount` was always undefined —
        // sequelize returns the bare rowCount *number* as the second element —
        // so `added` was false even on a first-time insert.
        const [rows] = await sequelize.query(
            `INSERT INTO wishlists (user_id, game_id, added_at) VALUES (:userId, :gameId, NOW())
             ON CONFLICT (user_id, game_id) DO NOTHING
             RETURNING user_id`,
            { replacements: { userId, gameId }, transaction },
        );
        return (rows as unknown[]).length > 0;
    }

    static async findByUserAndGame(
        userId: string,
        gameId: string,
    ): Promise<Wishlist | null> {
        return Wishlist.findOne({ where: { userId, gameId } });
    }

    static async remove(userId: string, gameId: string): Promise<number> {
        const count = await Wishlist.destroy({ where: { userId, gameId } });
        return count;
    }

    static async listByUser(
        userId: string,
        params: { limit: number; offset: number },
    ): Promise<{ rows: Wishlist[]; count: number }> {
        // No `distinct`: it generated COUNT(DISTINCT("id")) on a table without
        // an id column, and with the composite PK it could only count one key.
        // The include is belongsTo (at most one game per row), so plain COUNT(*)
        // is exact.
        return Wishlist.findAndCountAll({
            where: { userId },
            include: [gameWithCover],
            limit: params.limit,
            offset: params.offset,
            order: [["added_at", "DESC"]],
        });
    }

    /** Fan-out input: every user who wishlisted any of these games. */
    static async listUserIdsByGames(gameIds: string[]): Promise<Array<{ userId: string; gameId: string }>> {
        if (gameIds.length === 0) return [];
        return sequelize.query<{ userId: string; gameId: string }>(
            `SELECT user_id AS "userId", game_id AS "gameId"
             FROM wishlists WHERE game_id = ANY(ARRAY[:gameIds]::uuid[])`,
            { replacements: { gameIds }, type: QueryTypes.SELECT },
        );
    }
}

export default WishlistRepository;
