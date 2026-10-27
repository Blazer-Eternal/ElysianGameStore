import { commerceConfig, Database } from "../config";
import { PaymentStatus } from "../enums/paymentStatusEnum";
import { RefundStatus } from "../enums/refundStatusEnum";
import { NotificationType } from "../enums/notificationTypeEnum";
import { INotification } from "../interfaces/notificationInterface";
import {
    LibraryEntryRepository,
    OrderItemRepository,
    OrderRepository,
    PaymentRepository,
    PlaySessionRepository,
    RefundRepository,
} from "../repositories";
import AppError from "../utils/appError";
import { audit, AUDIT_ACTIONS } from "./auditServices";
import { getProviderAdapter } from "./paymentProviders";
import { send } from "./notificationServices";

const { sequelize } = Database;

// ---------------------------------------------------------------------------
// Smart refund policy (spec logic #4):
//   eligible ⟺ purchased < 14 days ago AND total playtime < 2 hours
// Eligible requests are auto-approved and executed immediately; ineligible
// ones wait as PENDING for an admin decision (approve = override).
// ---------------------------------------------------------------------------
export interface Eligibility {
    eligible: boolean;
    reason: string;
    playtimeMinutes: number;
    daysSincePurchase: number;
}

export const evaluateEligibility = async (
    userId: string,
    gameId: string,
    paidAt: Date | null,
): Promise<Eligibility> => {
    const playtimeMinutes = await PlaySessionRepository.sumMinutes(userId, gameId);
    return evaluateWithPlaytime(paidAt, playtimeMinutes);
};

const evaluateWithPlaytime = (paidAt: Date | null, playtimeMinutes: number): Eligibility => {
    const daysSincePurchase = paidAt
        ? (Date.now() - new Date(paidAt).getTime()) / (24 * 3600 * 1000)
        : Number.POSITIVE_INFINITY;

    if (daysSincePurchase >= commerceConfig.refundWindowDays) {
        return {
            eligible: false,
            reason: `More than ${commerceConfig.refundWindowDays} days have passed since purchase`,
            playtimeMinutes,
            daysSincePurchase: Math.floor(daysSincePurchase),
        };
    }
    if (playtimeMinutes >= commerceConfig.refundPlaytimeMinutes) {
        return {
            eligible: false,
            reason: `You have played for more than ${commerceConfig.refundPlaytimeMinutes / 60} hours`,
            playtimeMinutes,
            daysSincePurchase: Math.floor(daysSincePurchase),
        };
    }
    return {
        eligible: true,
        reason: "Eligible under the 14-day / 2-hour policy",
        playtimeMinutes,
        daysSincePurchase: Math.floor(daysSincePurchase),
    };
};

export const getEligibilityForItem = async (userId: string, orderItemId: string): Promise<Eligibility> => {
    const item = await OrderItemRepository.findById(orderItemId);
    if (!item) throw AppError.notFound("Order item not found");
    const order = await OrderRepository.findById(item.orderId);
    if (!order || order.userId !== userId) throw AppError.notFound("Order item not found");
    if (order.status !== "PAID" && order.status !== "PARTIAL_REFUND") {
        throw AppError.badRequest("Only paid orders can be refunded");
    }
    const playtimeMinutes = await PlaySessionRepository.sumMinutes(userId, item.gameId);
    return evaluateWithPlaytime(order.paidAt, playtimeMinutes);
};

export const requestRefund = async (
    userId: string,
    input: { orderItemId: string; reason: string },
    ip?: string,
) => {
    const item = await OrderItemRepository.findById(input.orderItemId);
    if (!item) throw AppError.notFound("Order item not found");
    const order = await OrderRepository.findById(item.orderId);
    if (!order || order.userId !== userId) throw AppError.notFound("Order item not found");
    // Duplicate check first: after an auto-approve the order is already
    // REFUNDED, and "already requested" (409) is the accurate answer — the
    // paid-status check below would misleadingly answer 400.
    if (await RefundRepository.findByOrderItemId(item.id)) {
        throw AppError.conflict("A refund for this item was already requested");
    }
    if (order.status !== "PAID" && order.status !== "PARTIAL_REFUND") {
        throw AppError.badRequest("Only paid orders can be refunded");
    }
    const entry = await LibraryEntryRepository.findActiveByUserAndGame(userId, item.gameId);
    if (!entry) throw AppError.badRequest("This item is not in your library");

    const playtimeMinutes = await PlaySessionRepository.sumMinutes(userId, item.gameId);
    const eligibility = evaluateWithPlaytime(order.paidAt, playtimeMinutes);

    // Always created PENDING with no decision yet; eligible requests are then
    // claimed + executed by executeRefund (same atomic claim an admin decision
    // uses), so an auto-approve can never race a staff decision into a
    // double execution.
    const refund = await sequelize.transaction(async (t) => {
        const row = await RefundRepository.create(
            {
                orderItemId: item.id,
                reason: input.reason,
                // Tax-inclusive: the customer paid unit − discount + VAT for
                // this item (the snapshot already carries its own tax share),
                // so the refund returns exactly what was charged for it.
                amountPaisa: item.unitPricePaisa - item.discountPaisa + item.taxPaisa,
                status: RefundStatus.PENDING,
                requestedAt: new Date(),
                decidedBy: null,
                decidedAt: null,
            },
            t,
        );
        await audit({
            actorId: userId,
            action: AUDIT_ACTIONS.REFUND_REQUESTED,
            entity: "refund",
            entityId: row.id,
            diff: { eligible: eligibility.eligible, playtimeMinutes },
            ip,
            transaction: t,
        });
        return row;
    });

    if (eligibility.eligible) {
        return executeRefund(refund.id, userId, ip);
    }
    await send(
        userId,
        NotificationType.REFUND,
        "Refund request received",
        "Our team will review your request shortly.",
        { refundId: refund.id },
    );
    return { refund, eligibility, autoApproved: false };
};

// Executes an approved refund: provider refund (stubbed via adapter), license
// revocation, order status update and the audit trail — all in one
// transaction.
export const executeRefund = async (refundId: string, decidedBy: string | null, ip?: string) => {
    const refund = await RefundRepository.findById(refundId);
    if (!refund) throw AppError.notFound("Refund not found");

    const item = await OrderItemRepository.findById(refund.orderItemId);
    if (!item) throw AppError.notFound("Order item not found");
    const order = await OrderRepository.findById(item.orderId);
    if (!order) throw AppError.notFound("Order not found");

    await sequelize.transaction(async (t) => {
        // Atomic claim first: exactly one execution per refund, even when an
        // auto-approve races an admin decision or two admins decide at once.
        // Losers never touch money / entitlements.
        const claimed = await RefundRepository.claimDecision(
            refundId,
            RefundStatus.APPROVED,
            decidedBy,
            t,
        );
        if (!claimed) throw AppError.conflict("This refund has already been decided");

        // Provider refund call (mock adapter until real sandboxes are wired).
        const payments = await PaymentRepository.findByOrderId(order.id);
        const paid = payments.find((p) => p.status === PaymentStatus.PAID);
        if (paid) {
            const adapter = getProviderAdapter(paid.provider);
            await adapter.refund({
                providerTxnId: paid.providerTxnId,
                amountPaisa: refund.amountPaisa,
                reason: refund.reason,
            });
            await paid.update({ status: PaymentStatus.REFUNDED }, { transaction: t });
        }

        // Revoke the entitlement (revoked_at, never a delete).
        await LibraryEntryRepository.revokeByOrderItemId(item.id, t);

        // One item refunded → PARTIAL_REFUND; all → REFUNDED. The reads must
        // run inside this transaction: the claim above flipped this refund to
        // APPROVED but is not committed yet, and a separate connection (READ
        // COMMITTED) would still see PENDING and mislabel a fully-refunded
        // single-item order as PARTIAL_REFUND.
        const items = await OrderItemRepository.listByOrder(order.id);
        const refunds = await Promise.all(
            items.map((i) => RefundRepository.findByOrderItemId(i.id, t)),
        );
        const allRefunded = refunds.every((r) => r && r.status === RefundStatus.APPROVED);
        await OrderRepository.updateById(
            order.id,
            { status: allRefunded ? ("REFUNDED" as never) : ("PARTIAL_REFUND" as never) },
            t,
        );

        await audit({
            actorId: decidedBy,
            action: AUDIT_ACTIONS.REFUND_APPROVED,
            entity: "refund",
            entityId: refundId,
            diff: { amountPaisa: refund.amountPaisa, orderId: order.id },
            ip,
            transaction: t,
        });
    });

    await send(
        order.userId,
        NotificationType.REFUND,
        "Refund approved",
        "Your refund has been processed and the game was removed from your library.",
        { refundId, orderId: order.id },
    );

    return { refund: await RefundRepository.findById(refundId), orderId: order.id };
};

export const myRefunds = async (userId: string) => RefundRepository.listByUser(userId);

// ---------------------------------------------------------------------------
// Staff
// ---------------------------------------------------------------------------
export const adminList = async (status: string | undefined, page: number, pageSize: number) => {
    const { rows, count } = await RefundRepository.listByStatus(status, {
        limit: pageSize,
        offset: (page - 1) * pageSize,
    });
    return { refunds: rows, total: count, page, pageSize };
};

export const adminDecide = async (
    refundId: string,
    adminId: string,
    decision: "APPROVE" | "REJECT",
    ip?: string,
) => {
    const refund = await RefundRepository.findById(refundId);
    if (!refund) throw AppError.notFound("Refund not found");
    if (refund.status !== RefundStatus.PENDING) {
        throw AppError.badRequest("This refund has already been decided");
    }

    if (decision === "REJECT") {
        // Same atomic claim as approval: a REJECT racing an APPROVE cannot
        // overwrite a refund whose money has already moved.
        const claimed = await RefundRepository.claimDecision(
            refundId,
            RefundStatus.REJECTED,
            adminId,
        );
        if (!claimed) throw AppError.conflict("This refund has already been decided");
        const item = await OrderItemRepository.findById(refund.orderItemId);
        const order = item ? await OrderRepository.findById(item.orderId) : null;
        await audit({
            actorId: adminId,
            action: AUDIT_ACTIONS.REFUND_REJECTED,
            entity: "refund",
            entityId: refundId,
            ip,
        });
        if (order) {
            await send(
                order.userId,
                NotificationType.REFUND,
                "Refund request declined",
                "Your refund request did not meet the policy requirements.",
                { refundId },
            );
        }
        return RefundRepository.findById(refundId);
    }

    return executeRefund(refundId, adminId, ip);
};




