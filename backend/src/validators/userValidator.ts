import { z } from "zod";

export const updateProfileSchema = z
    .object({
        username: z
            .string()
            .min(3)
            .max(50)
            .regex(/^[a-zA-Z0-9_.]+$/)
            .optional(),
        countryCode: z.string().length(2).optional(),
        birthDate: z.coerce.date().optional(),
    })
    .refine((v) => Object.keys(v).length > 0, { message: "Nothing to update" });

export const changePasswordSchema = z.object({
    currentPassword: z.string().min(1).max(128),
    newPassword: z.string().min(8).max(128),
});
