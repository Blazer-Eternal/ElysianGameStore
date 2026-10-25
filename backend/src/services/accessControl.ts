import { Role } from "../enums/roleEnum";
import AppError from "../utils/appError";

// Central permission map (mirrors the ElysianLMS accessControl pattern).
// Ownership rules (e.g. "publisher may only edit own games") are enforced on
// top of these coarse role grants inside the services.
export enum Action {
    USER_READ = "user:read",
    USER_MANAGE = "user:manage",
    PUBLISHER_APPLY = "publisher:apply",
    PUBLISHER_MANAGE = "publisher:manage", // own publisher profile & catalog
    PUBLISHER_VERIFY = "publisher:verify",
    GAME_CREATE = "game:create",
    GAME_MODERATE = "game:moderate", // approve/reject/delist/relist
    PROMOTION_MANAGE = "promotion:manage",
    PROMOTION_MANAGE_STORE = "promotion:manage_store",
    COUPON_MANAGE = "coupon:manage",
    TAX_MANAGE = "tax:manage",
    GENRE_TAG_MANAGE = "genre_tag:manage",
    ORDER_VIEW_ANY = "order:view_any",
    REFUND_REVIEW = "refund:review",
    PAYOUT_RELEASE = "payout:release",
    REVIEW_MODERATE = "review:moderate",
    KEY_MANAGE = "key:manage",
    AUDIT_VIEW = "audit:view",
    DASHBOARD_ADMIN = "dashboard:admin",
}

const ALL: Action[] = Object.values(Action);

const GRANTS: Record<Role, Action[]> = {
    CUSTOMER: [],
    PUBLISHER: [
        Action.PUBLISHER_MANAGE,
        Action.GAME_CREATE,
        Action.PROMOTION_MANAGE,
        Action.KEY_MANAGE,
    ],
    SUPPORT: [
        Action.USER_READ,
        Action.ORDER_VIEW_ANY,
        Action.REFUND_REVIEW,
        Action.REVIEW_MODERATE,
    ],
    ADMIN: ALL,
};

export const can = (role: Role, action: Action): boolean =>
    (GRANTS[role] ?? []).includes(action);

export const assertCan = (role: Role, action: Action): void => {
    if (!can(role, action)) {
        throw AppError.forbidden(`Your role (${role}) cannot perform ${action}`);
    }
};
