import { QueryTypes, Transaction } from "sequelize";

import { Database } from "../config";
import Notification from "../models/notificationModel";
import { INotificationCreation } from "../interfaces/notificationInterface";

const { sequelize } = Database;

class NotificationRepository {
    static async create(
        data: INotificationCreation,
        transaction?: Transaction,
    ): Promise<Notification> {
        return Notification.create(data, { transaction });
    }

    static async listByUser(
        userId: string,
        params: { limit: number; offset: number; unreadOnly?: boolean },
    ): Promise<{ rows: Notification[]; count: number }> {
        const where: Record<string, unknown> = { userId };
        if (params.unreadOnly) where.readAt = null;
        return Notification.findAndCountAll({
            where,
            limit: params.limit,
            offset: params.offset,
            order: [["created_at", "DESC"]],
        });
    }

    static async markRead(id: string, userId: string): Promise<number> {
        const [count] = await Notification.update(
            { readAt: new Date() },
            { where: { id, userId, readAt: null } },
        );
        return count;
    }

    static async markAllRead(userId: string): Promise<number> {
        const [count] = await Notification.update(
            { readAt: new Date() },
            { where: { userId, readAt: null } },
        );
        return count;
    }

    // Wishlist → sale conversion: stamp the promotion notification when the
    // user later buys one of the promoted games (idempotent).
    static async markPromotionConverted(userId: string, gameId: string): Promise<number> {
        const [, meta] = await sequelize.query(
            `UPDATE notifications
             SET converted_at = NOW()
             WHERE user_id = :userId
               AND type = 'PROMOTION'
               AND converted_at IS NULL
               AND data->>'gameId' = :gameId`,
            { replacements: { userId, gameId } },
        );
        return (meta as unknown as { rowCount: number }).rowCount ?? 0;
    }

    static async conversionStats(promotionId?: string): Promise<{ sent: number; converted: number }> {
        const rows = await sequelize.query<{ sent: number; converted: number }>(
            `SELECT COUNT(*)::int AS sent,
                    COUNT(converted_at)::int AS converted
             FROM notifications
             WHERE type = 'PROMOTION'
               AND (:promotionId::uuid IS NULL OR data->>'promotionId' = :promotionId)`,
            { replacements: { promotionId: promotionId ?? null }, type: QueryTypes.SELECT },
        );
        return rows[0] ?? { sent: 0, converted: 0 };
    }
}

export default NotificationRepository;
