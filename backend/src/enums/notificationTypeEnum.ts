// In-app notification kinds. PROMOTION notifications are fanned out to
// wishlisters when a promotion starts; their conversion (a later purchase of
// the promoted game) is stamped back onto the notification for analytics.
export enum NotificationType {
    PROMOTION = "PROMOTION",
    ORDER = "ORDER",
    REFUND = "REFUND",
    GIFT = "GIFT",
    PAYOUT = "PAYOUT",
    SYSTEM = "SYSTEM",
}

export const NOTIFICATION_TYPES = Object.values(NotificationType);
