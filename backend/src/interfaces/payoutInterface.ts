import { PayoutCurrency } from "../enums/payoutCurrencyEnum";
import { PayoutStatus } from "../enums/payoutStatusEnum";

// One row per publisher per period. gross = item net sales (unit - discount)
// for orders PAID in the period; commission = (gross - refunds) ×
// (100 - revenueSharePct) / 100; net = gross - refunds - commission.
// USD payouts snapshot the FX rate at generation time.
export interface IPayout {
    id: string;
    publisherId: string;
    periodStart: Date;
    periodEnd: Date;
    grossPaisa: number;
    refundsPaisa: number;
    commissionPaisa: number;
    netPaisa: number;
    payoutCurrency: PayoutCurrency;
    fxRateSnapshot?: number | null;
    status: PayoutStatus;
    createdAt: Date;
    updatedAt: Date;
}

export type IPayoutCreation = Omit<IPayout, "id" | "createdAt" | "updatedAt">;
