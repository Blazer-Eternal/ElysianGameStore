// How a game entered a user's library. Refunds/chargebacks revoke the entry
// (revoked_at set) instead of deleting it, keeping the legal trail.
export enum LibrarySource {
    PURCHASE = "PURCHASE",
    GIFT = "GIFT",
    FREE = "FREE",
    KEY = "KEY",
}

export const LIBRARY_SOURCES = Object.values(LibrarySource);
