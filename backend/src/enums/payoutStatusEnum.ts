// Payout lifecycle. One row per publisher per period. PENDING rows are held
// for payoutHoldDays (30) after period_end before an admin releases them.
export enum PayoutStatus {
    PENDING = "PENDING",
    PAID = "PAID",
    CANCELLED = "CANCELLED",
}

export const PAYOUT_STATUSES = Object.values(PayoutStatus);
