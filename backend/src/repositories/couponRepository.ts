import { QueryTypes, Transaction } from "sequelize";

import { Database } from "../config";
import Coupon from "../models/couponModel";
import { ICoupon, ICouponCreation } from "../interfaces/couponInterface";

const { sequelize } = Database;

class CouponRepository {
    static async create(data: ICouponCreation, transaction?: Transaction): Promise<Coupon> {
        return Coupon.create(data, { transaction });
    }

    static async findById(id: string): Promise<Coupon | null> {
        return Coupon.findByPk(id);
    }

    static async findByCode(code: string): Promise<Coupon | null> {
        return Coupon.findOne({ where: { code: code.toUpperCase() } });
    }

    static async updateById(
        id: string,
        fields: Partial<ICoupon>,
        transaction?: Transaction,
    ): Promise<[number]> {
        return Coupon.update(fields, { where: { id }, transaction });
    }

    static async deleteById(id: string, transaction?: Transaction): Promise<number> {
        return Coupon.destroy({ where: { id }, transaction });
    }

    static async listAll(): Promise<Coupon[]> {
        return Coupon.findAll({ order: [["created_at", "DESC"]] });
    }

    /**
     * Atomic reservation of one use: the conditional UPDATE only succeeds
     * while used_count < max_uses, the coupon is active and unexpired — so
     * two concurrent checkouts can never over-redeem a capped coupon.
     */
    static async reserveAtomic(id: string, transaction?: Transaction): Promise<Coupon | null> {
        const rows = await sequelize.query<Record<string, unknown>>(
            `UPDATE coupons
             SET used_count = used_count + 1
             WHERE id = :id
               AND is_active = true
               AND used_count < max_uses
               AND (expires_at IS NULL OR expires_at > NOW())
             RETURNING *`,
            { replacements: { id }, transaction, type: QueryTypes.SELECT },
        );
        if (rows.length === 0) return null;
        return Coupon.build(rows[0] as never, { isNewRecord: false });
    }

    /** Release a reservation (order failed/cancelled), never below zero. */
    static async releaseAtomic(id: string, transaction?: Transaction): Promise<void> {
        await sequelize.query(
            `UPDATE coupons SET used_count = GREATEST(used_count - 1, 0) WHERE id = :id`,
            { replacements: { id }, transaction },
        );
    }

    /** How many times this user has already redeemed the coupon (per-user limit). */
    static async countUsedByUser(couponId: string, userId: string): Promise<number> {
        const rows = await sequelize.query<{ count: number }>(
            `SELECT COUNT(*)::int AS count FROM orders
             WHERE coupon_id = :couponId AND user_id = :userId
               AND status IN ('PENDING', 'PAID', 'PARTIAL_REFUND', 'REFUNDED')`,
            { replacements: { couponId, userId }, type: QueryTypes.SELECT },
        );
        return rows[0]?.count ?? 0;
    }
}

export default CouponRepository;
