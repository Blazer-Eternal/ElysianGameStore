import { z } from "zod";

export const registerSchema = z.object({
    email: z.email("Enter a valid email").max(320),
    username: z
        .string()
        .min(3, "Username must be at least 3 characters")
        .max(50)
        .regex(/^[a-zA-Z0-9_.]+$/, "Username may contain letters, numbers, _ and ."),
    password: z.string().min(8, "Password must be at least 8 characters").max(128),
    birthDate: z.coerce.date().optional(),
    countryCode: z.string().length(2).optional(),
});

export const loginSchema = z.object({
    email: z.email().max(320),
    password: z.string().min(1).max(128),
});

export const refreshSchema = z.object({}).passthrough();

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
