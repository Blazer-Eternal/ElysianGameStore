import { QueryTypes, Transaction } from "sequelize";

import { Database } from "../config";
import { RefundStatus } from "../enums/refundStatusEnum";
import OrderItem from "../models/orderItemModel";
import Refund from "../models/refundModel";
import { IRefund, IRefundCreation } from "../interfaces/refundInterface";

const { sequelize } = Database;

class RefundRepository {
    static async create(data: IRefundCreation, transaction?: Transaction): Promise<Refund> {
        return Refund.create(data, { transaction });
    }

    static async findById(id: string): Promise<Refund | null> {
        return Refund.findByPk(id);
    }

    static async findByOrderItemId(
        orderItemId: string,
        transaction?: Transaction,
    ): Promise<Refund | null> {
        return Refund.findOne({ where: { orderItemId }, transaction });
    }

    static async listByUser(userId: string): Promise<Refund[]> {
        // mapToModel: raw SELECT returns snake_case columns; mapping through
        // the Refund model keeps the API response camelCase like every other
        // listing endpoint.
        return sequelize.query<Refund>(
            `SELECT r.* FROM refunds r
             JOIN order_items oi ON oi.id = r.order_item_id
             JOIN orders o ON o.id = oi.order_id
             WHERE o.user_id = :userId
             ORDER BY r.requested_at DESC`,
            {
                replacements: { userId },
                type: QueryTypes.SELECT,
                model: Refund,
                mapToModel: true,
            },
        );
    }

    static async listByStatus(
        status?: string,
        params: { limit: number; offset: number } = { limit: 20, offset: 0 },
    ): Promise<{ rows: Refund[]; count: number }> {
        const where: Record<string, unknown> = {};
        if (status) where.status = status;
        return Refund.findAndCountAll({
            where,
            include: [{ model: OrderItem, as: "orderItem" }],
            limit: params.limit,
            offset: params.offset,
            order: [["requested_at", "DESC"]],
            distinct: true,
        });
    }

    static async updateById(
        id: string,
        fields: Partial<IRefund>,
        transaction?: Transaction,
    ): Promise<[number]> {
        return Refund.update(fields, { where: { id }, transaction });
    }

    /**
     * Atomic claim of a decided refund: only one caller may set decided_at.
     * Concurrent admin decisions (or an auto-approve racing an admin approve)
     * resolve to a single winner; losers get `false` and must respond 409.
     */
    static async claimDecision(
        id: string,
        status: RefundStatus.APPROVED | RefundStatus.REJECTED,
        decidedBy: string | null,
        transaction?: Transaction,
    ): Promise<boolean> {
        const [count] = await Refund.update(
            { status, decidedBy, decidedAt: new Date() },
            { where: { id, decidedAt: null }, transaction },
        );
        return count > 0;
    }

    /** Payout input: approved refunds against a publisher's items in period. */
    static async aggregateApproved(
        publisherId: string,
        periodStart: Date,
        periodEnd: Date,
    ): Promise<{ refundsPaisa: number }> {
        const rows = await sequelize.query<{ refunds: number }>(
            `SELECT COALESCE(SUM(r.amount_paisa), 0)::int AS refunds
             FROM refunds r
             JOIN order_items oi ON oi.id = r.order_item_id
             WHERE oi.publisher_id = :publisherId
               AND r.status = 'APPROVED'
               AND r.decided_at >= :periodStart AND r.decided_at < :periodEnd`,
            {
                replacements: { publisherId, periodStart, periodEnd },
                type: QueryTypes.SELECT,
            },
        );
        return { refundsPaisa: rows[0]?.refunds ?? 0 };
    }
}

export default RefundRepository;
