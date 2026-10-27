import { QueryTypes, Transaction } from "sequelize";

import { Database } from "../config";
import { MediaType } from "../enums/mediaTypeEnum";
import Game from "../models/gameModel";
import GameMedia from "../models/gameMediaModel";
import LibraryEntry from "../models/libraryEntryModel";
import { ILibraryEntry, ILibraryEntryCreation } from "../interfaces/libraryEntryInterface";

const { sequelize } = Database;

// Library rows render as game cards, so COVER artwork is fetched with them.
const gameWithCover = {
    model: Game,
    as: "game",
    include: [
        { model: GameMedia, as: "media", where: { type: MediaType.COVER }, required: false },
    ],
};

class LibraryEntryRepository {
    /**
     * Creates an entitlement unless the user already owns the game — the
     * ON CONFLICT DO NOTHING makes replays of a payment webhook harmless and
     * returns the existing row (unique user_id + game_id).
     */
    static async createIfAbsent(
        data: ILibraryEntryCreation,
        transaction?: Transaction,
    ): Promise<LibraryEntry | null> {
        const rows = await sequelize.query<Record<string, unknown>>(
            `INSERT INTO library_entries (user_id, game_id, order_item_id, acquired_at, source)
             VALUES (:userId, :gameId, :orderItemId, :acquiredAt, :source)
             ON CONFLICT (user_id, game_id) DO NOTHING
             RETURNING *`,
            {
                replacements: {
                    userId: data.userId,
                    gameId: data.gameId,
                    orderItemId: data.orderItemId ?? null,
                    acquiredAt: data.acquiredAt ?? new Date(),
                    source: data.source,
                },
                transaction,
                type: QueryTypes.SELECT,
            },
        );
        if (rows.length === 0) {
            return LibraryEntry.findOne({
                where: { userId: data.userId, gameId: data.gameId },
                transaction,
            });
        }
        return LibraryEntry.build(rows[0] as never, { isNewRecord: false });
    }

    static async findByUserAndGame(
        userId: string,
        gameId: string,
        transaction?: Transaction,
    ): Promise<LibraryEntry | null> {
        return LibraryEntry.findOne({ where: { userId, gameId }, transaction });
    }

    static async findActiveByUserAndGame(
        userId: string,
        gameId: string,
        transaction?: Transaction,
    ): Promise<LibraryEntry | null> {
        return LibraryEntry.findOne({
            where: { userId, gameId, revokedAt: null },
            transaction,
        });
    }

    static async anyActiveOwned(userId: string, gameIds: string[]): Promise<boolean> {
        const count = await LibraryEntry.count({
            where: { userId, gameId: gameIds, revokedAt: null },
        });
        return count > 0;
    }

    static async listByUser(
        userId: string,
        params: { includeRevoked?: boolean; limit: number; offset: number },
    ): Promise<{ rows: LibraryEntry[]; count: number }> {
        const where: Record<string, unknown> = { userId };
        if (!params.includeRevoked) where.revokedAt = null;
        return LibraryEntry.findAndCountAll({
            where,
            include: [gameWithCover],
            limit: params.limit,
            offset: params.offset,
            order: [["acquired_at", "DESC"]],
            distinct: true,
        });
    }

    /** Revocation (refund/chargeback): stamps revoked_at, never deletes. */
    static async revoke(id: string, transaction?: Transaction): Promise<number> {
        const [count] = await LibraryEntry.update(
            { revokedAt: new Date() },
            { where: { id, revokedAt: null }, transaction },
        );
        return count;
    }

    static async revokeByOrderItemId(orderItemId: string, transaction?: Transaction): Promise<number> {
        const [count] = await LibraryEntry.update(
            { revokedAt: new Date() },
            { where: { orderItemId, revokedAt: null }, transaction },
        );
        return count;
    }
}

export default LibraryEntryRepository;
