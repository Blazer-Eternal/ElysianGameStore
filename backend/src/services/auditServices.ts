import { Transaction } from "sequelize";

import AuditLogRepository from "../repositories/auditLogRepository";

// Append-only audit trail helper. Called for every sensitive mutation:
// price changes, refunds, role changes, publisher verifications, payouts.
export const audit = async (params: {
    actorId?: string | null;
    action: string;
    entity: string;
    entityId: string;
    diff?: unknown;
    ip?: string | null;
    transaction?: Transaction;
}): Promise<void> => {
    try {
        await AuditLogRepository.create({
            actorId: params.actorId ?? null,
            action: params.action,
            entity: params.entity,
            entityId: params.entityId,
            diff: params.diff ?? null,
            ip: params.ip ?? null,
        });
    } catch (error) {
        // The audit trail must never break the operation it describes.
        console.error("audit log failed:", (error as Error).message);
    }
    void params.transaction;
};

export const AUDIT_ACTIONS = {
    USER_ROLE_CHANGED: "USER_ROLE_CHANGED",
    USER_STATUS_CHANGED: "USER_STATUS_CHANGED",
    PUBLISHER_APPLIED: "PUBLISHER_APPLIED",
    PUBLISHER_STATUS_CHANGED: "PUBLISHER_STATUS_CHANGED",
    GAME_CREATED: "GAME_CREATED",
    GAME_UPDATED: "GAME_UPDATED",
    GAME_PRICE_CHANGED: "GAME_PRICE_CHANGED",
    GAME_SUBMITTED: "GAME_SUBMITTED",
    GAME_APPROVED: "GAME_APPROVED",
    GAME_REJECTED: "GAME_REJECTED",
    GAME_DELISTED: "GAME_DELISTED",
    GAME_RELISTED: "GAME_RELISTED",
    PROMOTION_CREATED: "PROMOTION_CREATED",
    PROMOTION_DELETED: "PROMOTION_DELETED",
    COUPON_CREATED: "COUPON_CREATED",
    COUPON_UPDATED: "COUPON_UPDATED",
    TAX_CONFIG_CREATED: "TAX_CONFIG_CREATED",
    ORDER_CREATED: "ORDER_CREATED",
    ORDER_CANCELLED: "ORDER_CANCELLED",
    ORDER_EXPIRED: "ORDER_EXPIRED",
    PAYMENT_INITIATED: "PAYMENT_INITIATED",
    ORDER_PAID: "ORDER_PAID",
    ORDER_PAYMENT_FAILED: "ORDER_PAYMENT_FAILED",
    REFUND_REQUESTED: "REFUND_REQUESTED",
    REFUND_APPROVED: "REFUND_APPROVED",
    REFUND_REJECTED: "REFUND_REJECTED",
    GAME_KEY_REDEEMED: "GAME_KEY_REDEEMED",
    GIFT_REDEEMED: "GIFT_REDEEMED",
    PAYOUT_GENERATED: "PAYOUT_GENERATED",
    PAYOUT_RELEASED: "PAYOUT_RELEASED",
    REVIEW_MODERATED: "REVIEW_MODERATED",
} as const;

export default audit;
