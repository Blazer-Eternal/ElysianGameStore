import { z } from "zod";

import { pageQuerySchema } from "./helpers";

export const wishlistItemSchema = z.object({
    gameId: z.uuid(),
});

export const listWishlistQuerySchema = pageQuerySchema;
