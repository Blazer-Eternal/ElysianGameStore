// Gift lifecycle. A gift is created at PAID time instead of a library entry;
// the single-use redeem token expires after expires_at.
export enum GiftStatus {
    PENDING = "PENDING",
    REDEEMED = "REDEEMED",
    EXPIRED = "EXPIRED",
    CANCELLED = "CANCELLED",
}

export const GIFT_STATUSES = Object.values(GiftStatus);
