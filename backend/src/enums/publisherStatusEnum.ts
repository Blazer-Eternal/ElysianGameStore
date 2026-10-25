// A publisher must reach VERIFIED before any of its games can be published.
export enum PublisherStatus {
    UNVERIFIED = "UNVERIFIED",
    VERIFIED = "VERIFIED",
    SUSPENDED = "SUSPENDED",
}

export const PUBLISHER_STATUSES = Object.values(PublisherStatus);
