// Users are never hard-deleted: orders must survive for legal/accounting
// reasons, so DELETED means the account is soft-deleted and blocked.
export enum UserStatus {
    ACTIVE = "ACTIVE",
    SUSPENDED = "SUSPENDED",
    DELETED = "DELETED",
}

export const USER_STATUSES = Object.values(UserStatus);
