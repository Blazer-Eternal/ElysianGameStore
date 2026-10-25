import { z } from "zod";

import { MODERATION_STATUSES } from "../enums/moderationStatusEnum";
import { pageQuerySchema } from "./helpers";

export const createReviewSchema = z.object({
    gameId: z.uuid(),
    recommend: z.boolean(),
    rating: z.number().int().min(1).max(5).optional(),
    body: z.string().max(5000).optional(),
});

export const updateReviewSchema = z
    .object({
        recommend: z.boolean().optional(),
        rating: z.number().int().min(1).max(5).optional(),
        body: z.string().max(5000).optional(),
    })
    .refine((v) => Object.keys(v).length > 0, { message: "Nothing to update" });

export const listReviewsQuerySchema = pageQuerySchema.extend({
    gameId: z.uuid(),
    sort: z.enum(["recent", "helpful", "positive", "negative"]).default("recent"),
});

export const moderateReviewSchema = z.object({
    moderationStatus: z.enum(MODERATION_STATUSES as [string, ...string[]]),
});
