import { z } from "zod";

// Shared building blocks.
export const uuidSchema = z.uuid();

export const pageQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(50).default(12),
});

export const idParamSchema = z.object({ id: uuidSchema });

// Paisa amounts: integers only, never floats.
export const paisaSchema = z.number().int().min(0);
