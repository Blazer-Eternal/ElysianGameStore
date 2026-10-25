import { Router } from "express";

import * as publisherControllers from "../controllers/publisherControllers";
import * as userControllers from "../controllers/userControllers";
import * as refundControllers from "../controllers/refundControllers";
import * as reviewControllers from "../controllers/reviewControllers";
import * as miscControllers from "../controllers/miscControllers";
import { authenticate, requireAction, requireRole, validate } from "../../middleware";
import { Role } from "../../enums/roleEnum";
import { Action } from "../../services/accessControl";
import {
    adminPublisherListQuerySchema,
    adminPublisherStatusSchema,
    adminPayoutListQuerySchema,
    adminPayoutStatusSchema,
    adminUserListQuerySchema,
    adminUserUpdateSchema,
    adminRefundListQuerySchema,
    decideRefundSchema,
    moderateReviewSchema,
    taxConfigSchema,
    auditLogQuerySchema,
} from "../../validators";

// Everything under /api/admin is staff-only. Publisher approval and payout
// release sit here rather than in the publisher router because they act on
// *other* people's records; the handlers themselves live in publisherControllers.
const adminRoutes = Router();

adminRoutes.use(authenticate, requireRole(Role.ADMIN));

// Users (list / role & status changes — both audit-logged in the service)
adminRoutes.get(
    "/users",
    validate(adminUserListQuerySchema, "query"),
    userControllers.adminListUsers,
);
adminRoutes.patch(
    "/users/:id",
    validate(adminUserUpdateSchema),
    userControllers.adminUpdateUser,
);

// Publishers
adminRoutes.get(
    "/publishers",
    validate(adminPublisherListQuerySchema, "query"),
    publisherControllers.adminListPublishers,
);
adminRoutes.patch(
    "/publishers/:id/status",
    validate(adminPublisherStatusSchema),
    publisherControllers.adminSetPublisherStatus,
);

// Refunds (decisions on PENDING requests; approval executes the refund)
adminRoutes.get(
    "/refunds",
    validate(adminRefundListQuerySchema, "query"),
    refundControllers.adminListRefunds,
);
adminRoutes.patch(
    "/refunds/:id/decide",
    validate(decideRefundSchema),
    refundControllers.adminDecideRefund,
);

// Review moderation (hidden reviews disappear from the public listing)
adminRoutes.patch(
    "/reviews/:id/moderate",
    validate(moderateReviewSchema),
    reviewControllers.adminModerateReview,
);

// Tax config: effective-dated VAT rows; latest effective_from (<= now) wins
// in the pricing engine, so a new row takes effect on the next quote.
adminRoutes.get("/tax-config", miscControllers.getTaxConfig);
adminRoutes.post("/tax-config", validate(taxConfigSchema), miscControllers.setTaxConfig);
adminRoutes.put("/tax-config", validate(taxConfigSchema), miscControllers.setTaxConfig);

// Payouts (release after the hold period)
adminRoutes.get(
    "/payouts",
    validate(adminPayoutListQuerySchema, "query"),
    publisherControllers.adminListPayouts,
);
adminRoutes.patch(
    "/payouts/:id/status",
    validate(adminPayoutStatusSchema),
    publisherControllers.adminSetPayoutStatus,
);

// Maintenance: run the idempotent in-process sweeps on demand.
adminRoutes.post("/maintenance/sweeps", miscControllers.runSweeps);

// Append-only audit trail (AUDIT_VIEW resolves to ADMIN).
adminRoutes.get(
    "/audit-logs",
    requireAction(Action.AUDIT_VIEW),
    validate(auditLogQuerySchema, "query"),
    miscControllers.listAuditLogs,
);

export default adminRoutes;
