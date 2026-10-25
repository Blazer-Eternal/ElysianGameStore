import { z } from "zod";

export const redeemKeySchema = z.object({
    code: z.string().min(8).max(32),
});

export const generateKeysSchema = z.object({
    count: z.number().int().min(1).max(500),
});

export const listKeysQuerySchema = z.object({
    status: z.enum(["AVAILABLE", "RESERVED", "REDEEMED"]).optional(),
});
