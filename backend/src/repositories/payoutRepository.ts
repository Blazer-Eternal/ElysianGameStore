import { Transaction } from "sequelize";

import Payout from "../models/payoutModel";
import { IPayout, IPayoutCreation } from "../interfaces/payoutInterface";

class PayoutRepository {
    static async create(data: IPayoutCreation, transaction?: Transaction): Promise<Payout> {
        return Payout.create(data, { transaction });
    }

    static async findById(id: string): Promise<Payout | null> {
        return Payout.findByPk(id);
    }

    static async findByPublisherAndPeriod(
        publisherId: string,
        periodStart: Date,
        periodEnd: Date,
    ): Promise<Payout | null> {
        return Payout.findOne({ where: { publisherId, periodStart, periodEnd } });
    }

    static async listByPublisher(
        publisherId: string,
        params?: { limit?: number; offset?: number },
    ): Promise<{ rows: Payout[]; count: number }> {
        return Payout.findAndCountAll({
            where: { publisherId },
            limit: params?.limit,
            offset: params?.offset,
            order: [["period_end", "DESC"]],
        });
    }

    static async listByStatus(
        status?: string,
        params: { limit: number; offset: number } = { limit: 20, offset: 0 },
    ): Promise<{ rows: Payout[]; count: number }> {
        const where: Record<string, unknown> = {};
        if (status) where.status = status;
        return Payout.findAndCountAll({
            where,
            limit: params.limit,
            offset: params.offset,
            order: [["created_at", "DESC"]],
            distinct: true,
        });
    }

    static async updateById(
        id: string,
        fields: Partial<IPayout>,
        transaction?: Transaction,
    ): Promise<[number]> {
        return Payout.update(fields, { where: { id }, transaction });
    }
}

export default PayoutRepository;
