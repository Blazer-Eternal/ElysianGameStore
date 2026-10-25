// Local publishers are paid in NPR; foreign publishers in USD with an FX rate
// snapshotted at payout generation time.
export enum PayoutCurrency {
    NPR = "NPR",
    USD = "USD",
}

export const PAYOUT_CURRENCIES = Object.values(PayoutCurrency);
