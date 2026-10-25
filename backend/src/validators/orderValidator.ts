import { z } from "zod";

import { PAYMENT_PROVIDERS } from "../enums/paymentProviderEnum";
import { ORDER_STATUSES } from "../enums/orderStatusEnum";
import { pageQuerySchema } from "./helpers";

export const quoteSchema = z.object({
    gameIds: z.array(z.uuid()).min(1).max(50).optional(),
    couponCode: z.string().max(40).optional(),
});

export const createOrderSchema = z.object({
    gameIds: z.array(z.uuid()).min(1).max(50).optional(),
    couponCode: z.string().max(40).optional(),
    giftRecipientEmail: z.email().max(320).optional(),
});

export const paySchema = z.object({
    provider: z.enum(PAYMENT_PROVIDERS as [string, ...string[]]),
    returnUrl: z.url().optional(),
    idempotencyKey: z.string().min(8).max(120).optional(),
});

export const simulatePaymentSchema = z.object({
    provider: z.enum(PAYMENT_PROVIDERS as [string, ...string[]]).optional(),
    status: z.enum(["SUCCESS", "FAILURE"]).default("SUCCESS"),
});

export const listOrdersQuerySchema = pageQuerySchema.extend({
    status: z.enum(ORDER_STATUSES as [string, ...string[]]).optional(),
});
