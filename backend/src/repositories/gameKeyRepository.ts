import { Database } from "../config";
import { QueryTypes, Transaction } from "sequelize";

import GameKey from "../models/gameKeyModel";
import { IGameKeyCreation } from "../interfaces/gameKeyInterface";

const { sequelize } = Database;

class GameKeyRepository {
    static async bulkCreate(
        rows: Array<Pick<IGameKeyCreation, "gameId" | "keyHash">>,
        transaction?: Transaction,
    ): Promise<number> {
        await GameKey.bulkCreate(rows as never[], { transaction });
        return rows.length;
    }

    static async findByHash(keyHash: string, transaction?: Transaction): Promise<GameKey | null> {
        return GameKey.findOne({ where: { keyHash }, transaction });
    }

    /**
     * Row-locked lookup for redeem/reserve: the caller runs this inside a
     * transaction, checks the status transition and updates in place, so two
     * simultaneous redeems of the same key serialize and only one wins.
     */
    static async lockByHash(keyHash: string, transaction: Transaction): Promise<GameKey | null> {
        return GameKey.findOne({
            where: { keyHash },
            transaction,
            lock: Transaction.LOCK.UPDATE,
        });
    }

    static async findById(id: string): Promise<GameKey | null> {
        return GameKey.findByPk(id);
    }

    static async listByGame(gameId: string, status?: string): Promise<GameKey[]> {
        const where: Record<string, unknown> = { gameId };
        if (status) where.status = status;
        return GameKey.findAll({ where, order: [["created_at", "DESC"]] });
    }

    static async countByGameAndStatus(gameId: string): Promise<Record<string, number>> {
        const rows = await sequelize.query<{ status: string; count: number }>(
            `SELECT status, COUNT(*)::int AS count FROM game_keys
             WHERE game_id = :gameId GROUP BY status`,
            { replacements: { gameId }, type: QueryTypes.SELECT },
        );
        return rows.reduce<Record<string, number>>((acc, r) => {
            acc[r.status] = r.count;
            return acc;
        }, {});
    }

    /** Sweeper: abandoned reservations return to AVAILABLE. */
    static async releaseExpiredReservations(): Promise<number> {
        const [, meta] = await sequelize.query(
            `UPDATE game_keys
             SET status = 'AVAILABLE', reserved_until = NULL, reserved_by = NULL
             WHERE status = 'RESERVED' AND reserved_until < NOW()`,
        );
        return (meta as unknown as { rowCount: number }).rowCount ?? 0;
    }
}

export default GameKeyRepository;
