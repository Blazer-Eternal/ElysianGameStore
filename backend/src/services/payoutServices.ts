import { commerceConfig, Database } from "../config";
import { PayoutCurrency } from "../enums/payoutCurrencyEnum";
import { PayoutStatus } from "../enums/payoutStatusEnum";
import { NotificationType } from "../enums/notificationTypeEnum";
import { OrderItemRepository, PayoutRepository, PublisherRepository, RefundRepository } from "../repositories";
import AppError from "../utils/appError";
import { audit, AUDIT_ACTIONS } from "./auditServices";
import { send } from "./notificationServices";

const { sequelize } = Database;

// ---------------------------------------------------------------------------
// Publisher revenue share & payouts (spec logic #5).
//   gross     = Σ (unit_price − discount) for the publisher's items in orders
//               PAID inside the period (snapshotted at checkout — immutable)
//   refunds   = Σ approved refunds against those items
//   commission= (gross − refunds) × (100 − revenue_share_pct) / 100
//   net       = gross − refunds − commission
// Held for payoutHoldDays (30) after period_end before an admin releases it.
// USD publishers get an FX snapshot recorded at generation time.
// ---------------------------------------------------------------------------
export const releasesAt = (periodEnd: Date): Date =>
    new Date(new Date(periodEnd).getTime() + commerceConfig.payoutHoldDays * 24 * 3600 * 1000);

export const computeForPeriod = async (
    publisherId: string,
    periodStart: Date,
    periodEnd: Date,
) => {
    // Validate here (not just in generate) so preview rejects inverted or
    // empty ranges too — otherwise a bad range silently quotes zero.
    if (new Date(periodEnd) <= new Date(periodStart)) {
        throw AppError.badRequest("periodEnd must be after periodStart");
    }
    const publisher = await PublisherRepository.findById(publisherId);
    if (!publisher) throw AppError.notFound("Publisher not found");

    const { grossPaisa, units } = await OrderItemRepository.aggregateNetSales(
        publisherId,
        periodStart,
        periodEnd,
    );
    const { refundsPaisa } = await RefundRepository.aggregateApproved(
        publisherId,
        periodStart,
        periodEnd,
    );

    const netSalesPaisa = Math.max(grossPaisa - refundsPaisa, 0);
    // Floor (not round) so the platform absorbs the sub-paisa remainder and
    // commission never exceeds the exact share; net = gross − refunds − commission.
    const commissionPaisa = Math.floor((netSalesPaisa * (100 - publisher.revenueSharePct)) / 100);
    const netPaisa = netSalesPaisa - commissionPaisa;

    return {
        publisherId,
        periodStart,
        periodEnd,
        grossPaisa,
        refundsPaisa,
        commissionPaisa,
        netPaisa,
        units,
        payoutCurrency: publisher.payoutCurrency,
        fxRateSnapshot:
            publisher.payoutCurrency === PayoutCurrency.USD ? commerceConfig.fxRateUsdNpr : null,
        releasesAt: releasesAt(periodEnd),
    };
};

// One payout row per publisher per period (unique composite). PENDING rows
// can be regenerated while the hold runs; PAID rows are frozen.
export const generate = async (
    publisherId: string,
    actorId: string,
    periodStart: Date,
    periodEnd: Date,
    ip?: string,
) => {
    const computed = await computeForPeriod(publisherId, periodStart, periodEnd);
    const payout = await sequelize.transaction(async (t) => {
        const existing = await PayoutRepository.findByPublisherAndPeriod(
            publisherId,
            periodStart,
            periodEnd,
        );
        if (existing && existing.status === PayoutStatus.PAID) {
            throw AppError.conflict("This payout was already released and is frozen");
        }
        const fields = {
            grossPaisa: computed.grossPaisa,
            refundsPaisa: computed.refundsPaisa,
            commissionPaisa: computed.commissionPaisa,
            netPaisa: computed.netPaisa,
            payoutCurrency: computed.payoutCurrency,
            fxRateSnapshot: computed.fxRateSnapshot,
            status: PayoutStatus.PENDING,
        };
        if (existing) {
            await existing.update(fields, { transaction: t });
            return existing;
        }
        return PayoutRepository.create(
            { publisherId, periodStart, periodEnd, ...fields },
            t,
        );
    });

    await audit({
        actorId,
        action: AUDIT_ACTIONS.PAYOUT_GENERATED,
        entity: "payout",
        entityId: payout.id,
        diff: { netPaisa: computed.netPaisa, periodStart, periodEnd },
        ip,
    });

    return { ...computed, payoutId: payout.id, status: payout.status };
};

export const listMine = async (
    publisherId: string,
    page: number,
    pageSize: number,
) => {
    const { rows, count } = await PayoutRepository.listByPublisher(publisherId, {
        limit: pageSize,
        offset: (page - 1) * pageSize,
    });
    return {
        payouts: rows.map((p) => ({
            ...p.toJSON(),
            releasesAt: releasesAt(p.periodEnd),
            onHold: p.status === PayoutStatus.PENDING && releasesAt(p.periodEnd) > new Date(),
        })),
        total: count,
        page,
        pageSize,
    };
};

export const preview = async (
    publisherId: string,
    periodStart: Date,
    periodEnd: Date,
) => computeForPeriod(publisherId, periodStart, periodEnd);

// ---------------------------------------------------------------------------
// Admin release: PENDING → PAID once the hold has elapsed.
// ---------------------------------------------------------------------------
export const adminList = async (status: string | undefined, page: number, pageSize: number) => {
    const { rows, count } = await PayoutRepository.listByStatus(status, {
        limit: pageSize,
        offset: (page - 1) * pageSize,
    });
    return { payouts: rows, total: count, page, pageSize };
};

export const adminSetStatus = async (
    payoutId: string,
    adminId: string,
    status: PayoutStatus,
    ip?: string,
) => {
    const payout = await PayoutRepository.findById(payoutId);
    if (!payout) throw AppError.notFound("Payout not found");
    if (payout.status === PayoutStatus.PAID) {
        throw AppError.conflict("This payout is already released");
    }
    if (status === PayoutStatus.PAID && releasesAt(payout.periodEnd) > new Date()) {
        throw AppError.badRequest(
            `Payout is on hold until ${releasesAt(payout.periodEnd).toISOString().slice(0, 10)}`,
        );
    }

    await PayoutRepository.updateById(payoutId, { status });

    await audit({
        actorId: adminId,
        action: status === PayoutStatus.PAID ? AUDIT_ACTIONS.PAYOUT_RELEASED : "PAYOUT_UPDATED",
        entity: "payout",
        entityId: payoutId,
        diff: { from: payout.status, to: status },
        ip,
    });

    const publisher = await PublisherRepository.findById(payout.publisherId);
    if (publisher) {
        await send(
            publisher.ownerUserId,
            NotificationType.PAYOUT,
            status === PayoutStatus.PAID ? "Payout released" : "Payout updated",
            status === PayoutStatus.PAID
                ? `A payout of Rs ${(payout.netPaisa / 100).toFixed(2)} is on its way.`
                : `Your payout status changed to ${status}.`,
            { payoutId },
        );
    }

    return PayoutRepository.findById(payoutId);
};
