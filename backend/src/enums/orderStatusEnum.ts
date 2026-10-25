// Order lifecycle:
//   PENDING  → created by checkout, waiting for payment (never trusted totals:
//              everything was recomputed server-side and snapshotted)
//   PAID     → webhook verified; library entries created; immutable from here
//   FAILED   → payment failed/cancelled/expired (coupon reservation released)
//   REFUNDED / PARTIAL_REFUND → one or more items refunded and revoked
export enum OrderStatus {
    PENDING = "PENDING",
    PAID = "PAID",
    FAILED = "FAILED",
    REFUNDED = "REFUNDED",
    PARTIAL_REFUND = "PARTIAL_REFUND",
}

export const ORDER_STATUSES = Object.values(OrderStatus);
