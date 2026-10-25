import { z } from "zod";

export const redeemGiftSchema = z.object({
    token: z.string().min(16).max(128),
});
