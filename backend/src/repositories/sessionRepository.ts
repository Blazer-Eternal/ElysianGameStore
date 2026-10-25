import { Op, Transaction } from "sequelize";

import { Database } from "../config";
import Session from "../models/sessionModel";
import { ISessionCreation } from "../interfaces/sessionInterface";

const { sequelize } = Database;
void sequelize;

class SessionRepository {
    static async create(data: ISessionCreation, transaction?: Transaction): Promise<Session> {
        return Session.create(data, { transaction });
    }

    static async findByHash(refreshTokenHash: string): Promise<Session | null> {
        return Session.findOne({ where: { refreshTokenHash } });
    }

    static async findById(id: string): Promise<Session | null> {
        return Session.findByPk(id);
    }

    static async revoke(id: string, transaction?: Transaction): Promise<number> {
        const [count] = await Session.update(
            { revokedAt: new Date() },
            { where: { id, revokedAt: null }, transaction },
        );
        return count;
    }

    static async revokeAllForUser(userId: string, transaction?: Transaction): Promise<number> {
        const [count] = await Session.update(
            { revokedAt: new Date() },
            { where: { userId, revokedAt: null }, transaction },
        );
        return count;
    }

    // Housekeeping: drop rows whose expiry passed long ago.
    static async deleteExpired(): Promise<number> {
        const count = await Session.destroy({
            where: { expiresAt: { [Op.lt]: new Date(Date.now() - 7 * 24 * 3600 * 1000) } },
        });
        return count;
    }
}

export default SessionRepository;
