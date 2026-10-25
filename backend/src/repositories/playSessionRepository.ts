import { QueryTypes, Transaction } from "sequelize";

import { Database } from "../config";
import PlaySession from "../models/playSessionModel";
import { IPlaySessionCreation } from "../interfaces/playSessionInterface";

const { sequelize } = Database;

class PlaySessionRepository {
    static async create(data: IPlaySessionCreation, transaction?: Transaction): Promise<PlaySession> {
        return PlaySession.create(data, { transaction });
    }

    static async findById(id: string): Promise<PlaySession | null> {
        return PlaySession.findByPk(id);
    }

    static async close(id: string, endedAt: Date, transaction?: Transaction): Promise<number> {
        const [count] = await PlaySession.update(
            { endedAt },
            { where: { id, endedAt: null }, transaction },
        );
        return count;
    }

    /** Closes every open session for a user+game (double-start protection). */
    static async closeOpen(userId: string, gameId: string, endedAt: Date, transaction?: Transaction): Promise<number> {
        const [count] = await PlaySession.update(
            { endedAt },
            { where: { userId, gameId, endedAt: null }, transaction },
        );
        return count;
    }

    /** Total minutes played by a user on a game (refund eligibility input). */
    static async sumMinutes(userId: string, gameId: string): Promise<number> {
        const rows = await sequelize.query<{ minutes: number }>(
            `SELECT COALESCE(SUM(EXTRACT(EPOCH FROM (COALESCE(ended_at, NOW()) - started_at)) / 60), 0)::int AS minutes
             FROM play_sessions WHERE user_id = :userId AND game_id = :gameId`,
            { replacements: { userId, gameId }, type: QueryTypes.SELECT },
        );
        return rows[0]?.minutes ?? 0;
    }

    /** Sweeper: sessions left open for over a day get closed at the cutoff. */
    static async closeStale(cutoff: Date): Promise<number> {
        const [, meta] = await sequelize.query(
            `UPDATE play_sessions SET ended_at = :cutoff
             WHERE ended_at IS NULL AND started_at < :cutoff`,
            { replacements: { cutoff } },
        );
        return (meta as unknown as { rowCount: number }).rowCount ?? 0;
    }
}

export default PlaySessionRepository;
