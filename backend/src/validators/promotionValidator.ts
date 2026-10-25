import { z } from "zod";

import { FUNDED_BY } from "../enums/fundedByEnum";
import { PROMOTION_TYPES } from "../enums/promotionTypeEnum";

export const createPromotionSchema = z.object({
    name: z.string().min(3).max(120),
    type: z.enum(PROMOTION_TYPES as [string, ...string[]]),
    value: z.number().int().min(1).max(1000000),
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date(),
    fundedBy: z.enum(FUNDED_BY as [string, ...string[]]).optional(),
});

export const updatePromotionSchema = z
    .object({
        name: z.string().min(3).max(120).optional(),
        startsAt: z.coerce.date().optional(),
        endsAt: z.coerce.date().optional(),
    })
    .refine((v) => Object.keys(v).length > 0, { message: "Nothing to update" });

export const attachPromotionGameSchema = z.object({
    gameId: z.uuid(),
    discountPct: z.number().int().min(1).max(90).optional(),
});
