import { z } from "zod";

import { PAYOUT_CURRENCIES } from "../enums/payoutCurrencyEnum";

export const applyPublisherSchema = z.object({
    name: z.string().min(2).max(120),
    legalName: z.string().min(2).max(160),
    taxId: z.string().max(60).optional(),
    payoutAccount: z.string().max(120).optional(),
    payoutCurrency: z.enum(PAYOUT_CURRENCIES as [string, ...string[]]).optional(),
});

export const updatePublisherSchema = z
    .object({
        name: z.string().min(2).max(120).optional(),
        legalName: z.string().min(2).max(160).optional(),
        taxId: z.string().max(60).optional(),
        payoutAccount: z.string().max(120).optional(),
        payoutCurrency: z.enum(PAYOUT_CURRENCIES as [string, ...string[]]).optional(),
    })
    .refine((v) => Object.keys(v).length > 0, { message: "Nothing to update" });

export const generatePayoutSchema = z.object({
    periodStart: z.coerce.date(),
    periodEnd: z.coerce.date(),
});
