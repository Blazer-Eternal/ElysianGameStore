import { z } from "zod";

export const requestRefundSchema = z.object({
    orderItemId: z.uuid(),
    reason: z.string().min(3).max(500),
});

export const decideRefundSchema = z.object({
    decision: z.enum(["APPROVE", "REJECT"]),
});
