import { z } from "zod";

import { PLATFORMS } from "../enums/platformEnum";
import { pageQuerySchema } from "./helpers";

export const startSessionSchema = z.object({
    gameId: z.uuid(),
});

export const listNotificationsQuerySchema = pageQuerySchema.extend({
    unreadOnly: z
        .enum(["true", "false"])
        .transform((v) => v === "true")
        .optional(),
});

export const downloadQuerySchema = z.object({
    platform: z.enum(PLATFORMS as [string, ...string[]]).default("WINDOWS"),
});

export const wishlistConversionQuerySchema = z.object({
    promotionId: z.uuid().optional(),
});

export const libraryQuerySchema = pageQuerySchema.extend({
    includeRevoked: z
        .enum(["true", "false"])
        .transform((v) => v === "true")
        .optional(),
});
