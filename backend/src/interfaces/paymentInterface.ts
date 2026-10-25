import { PaymentProvider } from "../enums/paymentProviderEnum";
import { PaymentStatus } from "../enums/paymentStatusEnum";

// provider_txn_id is unique — this is the webhook idempotency key (replays
// collapse onto one row). idempotency_key protects the initiate call so the
// same checkout retry never creates two payments. amount_paisa must equal the
// order total when the callback is accepted.
export interface IPayment {
    id: string;
    orderId: string;
    provider: PaymentProvider;
    providerTxnId?: string | null;
    idempotencyKey?: string | null;
    status: PaymentStatus;
    amountPaisa: number;
    rawResponse?: unknown | null;
    createdAt: Date;
    updatedAt: Date;
}

export type IPaymentCreation = Omit<IPayment, "id" | "createdAt" | "updatedAt">;
