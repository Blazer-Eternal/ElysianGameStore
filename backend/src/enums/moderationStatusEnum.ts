// Review moderation. Owner-only reviews start APPROVED (ownership is already
// verified); staff can hide a review by moving it to REJECTED.
export enum ModerationStatus {
    PENDING = "PENDING",
    APPROVED = "APPROVED",
    REJECTED = "REJECTED",
}

export const MODERATION_STATUSES = Object.values(ModerationStatus);
