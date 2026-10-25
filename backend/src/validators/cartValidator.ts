import { z } from "zod";

export const addItemSchema = z.object({
    gameId: z.uuid(),
});
