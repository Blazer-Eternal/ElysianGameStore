import { z } from "zod";

import { DISCOUNT_TYPES } from "../enums/discountTypeEnum";
import { paisaSchema } from "./helpers";

export const createCouponSchema = z.object({
    code: z
        .string()
        .min(4)
        .max(40)
        .regex(/^[A-Za-z0-9_-]+$/, "Coupon code may contain letters, numbers, - and _"),
    discountType: z.enum(DISCOUNT_TYPES as [string, ...string[]]),
    value: z.number().int().min(1).max(1000000),
    maxUses: z.number().int().min(1).max(1000000),
    perUserLimit: z.number().int().min(1).max(1000).optional(),
    minOrderPaisa: paisaSchema.optional(),
    expiresAt: z.coerce.date().optional(),
    isActive: z.boolean().optional(),
});

export const updateCouponSchema = z
    .object({
        maxUses: z.number().int().min(1).max(1000000).optional(),
        perUserLimit: z.number().int().min(1).max(1000).optional(),
        minOrderPaisa: paisaSchema.optional(),
        expiresAt: z.coerce.date().nullable().optional(),
        isActive: z.boolean().optional(),
    })
    .refine((v) => Object.keys(v).length > 0, { message: "Nothing to update" });
