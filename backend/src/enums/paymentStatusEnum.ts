// Payment row lifecycle. provider_txn_id (unique) is stamped when the
// provider callback arrives, which is what makes webhook replays idempotent.
export enum PaymentStatus {
    INITIATED = "INITIATED",
    PENDING = "PENDING",
    PAID = "PAID",
    FAILED = "FAILED",
    REFUNDED = "REFUNDED",
}

export const PAYMENT_STATUSES = Object.values(PaymentStatus);
