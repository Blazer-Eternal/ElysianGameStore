import { z } from "zod";

import { PAYOUT_STATUSES } from "../enums/payoutStatusEnum";
import { PUBLISHER_STATUSES } from "../enums/publisherStatusEnum";
import { REFUND_STATUSES } from "../enums/refundStatusEnum";
import { ROLES } from "../enums/roleEnum";
import { USER_STATUSES } from "../enums/userStatusEnum";
import { pageQuerySchema } from "./helpers";

export const adminUserListQuerySchema = pageQuerySchema.extend({
    role: z.enum(ROLES as [string, ...string[]]).optional(),
    status: z.enum(USER_STATUSES as [string, ...string[]]).optional(),
    search: z.string().max(100).optional(),
});

export const adminUserUpdateSchema = z
    .object({
        role: z.enum(ROLES as [string, ...string[]]).optional(),
        status: z.enum(USER_STATUSES as [string, ...string[]]).optional(),
    })
    .refine((v) => Object.keys(v).length > 0, { message: "Nothing to update" });

export const adminPublisherListQuerySchema = pageQuerySchema.extend({
    status: z.enum(PUBLISHER_STATUSES as [string, ...string[]]).optional(),
});

export const adminPublisherStatusSchema = z.object({
    status: z.enum(PUBLISHER_STATUSES as [string, ...string[]]),
});

export const adminRefundListQuerySchema = pageQuerySchema.extend({
    status: z.enum(REFUND_STATUSES as [string, ...string[]]).optional(),
});

export const adminPayoutListQuerySchema = pageQuerySchema.extend({
    status: z.enum(PAYOUT_STATUSES as [string, ...string[]]).optional(),
});

export const adminPayoutStatusSchema = z.object({
    status: z.enum(["PAID", "CANCELLED"] as [string, ...string[]]),
});

export const taxConfigSchema = z.object({
    name: z.string().min(2).max(60).default("VAT"),
    rateBps: z.number().int().min(0).max(10000),
    effectiveFrom: z.coerce.date(),
});

export const auditLogQuerySchema = pageQuerySchema.extend({
    entity: z.string().max(60).optional(),
    entityId: z.string().max(64).optional(),
    actorId: z.uuid().optional(),
});
