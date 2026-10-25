import { QueryTypes, Transaction } from "sequelize";

import { Database } from "../config";
import OrderItem from "../models/orderItemModel";
import Publisher from "../models/publisherModel";
import Refund from "../models/refundModel";
import { IOrderItemCreation } from "../interfaces/orderItemInterface";

const { sequelize } = Database;

class OrderItemRepository {
    static async create(data: IOrderItemCreation, transaction?: Transaction): Promise<OrderItem> {
        return OrderItem.create(data, { transaction });
    }

    static async findById(id: string): Promise<OrderItem | null> {
        return OrderItem.findByPk(id);
    }

    static async listByOrder(orderId: string): Promise<OrderItem[]> {
        return OrderItem.findAll({ where: { orderId } });
    }

    static async listByOrderWithRefund(orderId: string): Promise<OrderItem[]> {
        return OrderItem.findAll({
            where: { orderId },
            include: [{ model: Refund, as: "refund" }],
        });
    }

    /**
     * Payout input: net sales (unit price - discounts) per publisher for the
     * paid orders whose paid_at falls inside the period.
     */
    static async aggregateNetSales(
        publisherId: string,
        periodStart: Date,
        periodEnd: Date,
    ): Promise<{ grossPaisa: number; units: number }> {
        const rows = await sequelize.query<{ gross: number; units: number }>(
            `SELECT COALESCE(SUM(oi.unit_price_paisa - oi.discount_paisa), 0)::int AS gross,
                    COUNT(*)::int AS units
             FROM order_items oi
             JOIN orders o ON o.id = oi.order_id
             WHERE oi.publisher_id = :publisherId
               AND o.status IN ('PAID', 'PARTIAL_REFUND', 'REFUNDED')
               AND o.paid_at >= :periodStart AND o.paid_at < :periodEnd`,
            {
                replacements: { publisherId, periodStart, periodEnd },
                type: QueryTypes.SELECT,
            },
        );
        return { grossPaisa: rows[0]?.gross ?? 0, units: rows[0]?.units ?? 0 };
    }

    /** Units sold per publisher inside the period (dashboard). */
    static async unitsByGame(
        publisherId: string,
        since: Date,
    ): Promise<Array<{ gameId: string; units: number; netPaisa: number }>> {
        return sequelize.query<{ gameId: string; units: number; netPaisa: number }>(
            `SELECT oi.game_id AS "gameId",
                    COUNT(*)::int AS units,
                    COALESCE(SUM(oi.unit_price_paisa - oi.discount_paisa), 0)::int AS "netPaisa"
             FROM order_items oi
             JOIN orders o ON o.id = oi.order_id
             WHERE oi.publisher_id = :publisherId
               AND o.status IN ('PAID', 'PARTIAL_REFUND')
               AND o.paid_at >= :since
             GROUP BY oi.game_id
             ORDER BY units DESC`,
            { replacements: { publisherId, since }, type: QueryTypes.SELECT },
        );
    }
}

export default OrderItemRepository;
