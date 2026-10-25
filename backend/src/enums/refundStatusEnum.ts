// Refund lifecycle. Eligible requests (purchased < 14 days AND playtime
// < 2 hrs) are auto-approved by RefundService; ineligible ones wait as PENDING
// for an admin decision (approve = override, reject = REJECTED).
export enum RefundStatus {
    PENDING = "PENDING",
    APPROVED = "APPROVED",
    REJECTED = "REJECTED",
}

export const REFUND_STATUSES = Object.values(RefundStatus);
