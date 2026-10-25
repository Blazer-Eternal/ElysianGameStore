import { createHash } from "crypto";

import { paymentConfig } from "../config";
import { PaymentProvider } from "../enums/paymentProviderEnum";
import { signPayload, verifySignature } from "../utils/signature";

// ---------------------------------------------------------------------------
// Provider-agnostic payment layer. Every real provider (eSewa, Khalti,
// ConnectIPS, IME Pay) plugs in as an adapter implementing this interface;
// until real sandbox credentials exist, PAYMENT_PROVIDER_MODE=mock wires the
// signed stub adapter below through the exact same code paths.
// ---------------------------------------------------------------------------
export interface InitiateInput {
    orderId: string;
    paymentId: string;
    amountPaisa: number;
    returnUrl?: string;
    webhookUrl: string;
}

export interface InitiateResult {
    paymentUrl?: string;
    payload: Record<string, unknown>;
}

export interface VerifyResult {
    ok: boolean;
    status: "SUCCESS" | "FAILURE";
    orderId: string;
    providerTxnId: string;
    amountPaisa: number;
    raw: Record<string, unknown>;
}

export interface PaymentProviderAdapter {
    provider: PaymentProvider;
    initiate(input: InitiateInput): Promise<InitiateResult>;
    verify(
        rawBody: Buffer | undefined,
        signature: string | undefined,
        body: Record<string, unknown>,
    ): Promise<VerifyResult>;
    refund(input: {
        providerTxnId: string | null;
        amountPaisa: number;
        reason: string;
    }): Promise<{ providerRefundId: string }>;
}

// Standard webhook payload shared by the mock adapter (and expected from real
// adapters): { order_id, transaction_id, status, amount_paisa, provider }
// signed with x-elysian-signature: sha256=<hmac hex of the raw body>.
class MockProviderAdapter implements PaymentProviderAdapter {
    constructor(public provider: PaymentProvider) {}

    async initiate(input: InitiateInput): Promise<InitiateResult> {
        // Stands in for the provider's hosted checkout: the browser is sent
        // here, "pays", and the provider then calls our webhook.
        const token = createHash("sha256")
            .update(`${this.provider}:${input.orderId}:${input.amountPaisa}`)
            .digest("hex")
            .slice(0, 24);
        const paymentUrl =
            `${paymentConfig.mockBaseUrl}/${input.orderId}/mock-checkout` +
            `?provider=${this.provider}&payment_id=${input.paymentId}` +
            `&amount_paisa=${input.amountPaisa}&token=${token}`;
        return {
            paymentUrl,
            payload: {
                mode: "mock",
                provider: this.provider,
                orderId: input.orderId,
                amountPaisa: input.amountPaisa,
                webhookUrl: input.webhookUrl,
            },
        };
    }

    async verify(
        rawBody: Buffer | undefined,
        signature: string | undefined,
        body: Record<string, unknown>,
    ): Promise<VerifyResult> {
        // HMAC over the exact raw bytes the provider signed — the same check
        // every real adapter will perform against its own secret.
        const ok = !!rawBody && verifySignature(rawBody, signature);
        const status = body.status === "SUCCESS" ? "SUCCESS" : "FAILURE";
        return {
            ok,
            status,
            orderId: String(body.order_id ?? ""),
            providerTxnId: String(body.transaction_id ?? ""),
            amountPaisa: Number(body.amount_paisa ?? 0),
            raw: body,
        };
    }

    async refund(input: {
        providerTxnId: string | null;
        amountPaisa: number;
        reason: string;
    }): Promise<{ providerRefundId: string }> {
        // Stub of the provider's refund API call.
        return {
            providerRefundId: `MOCK-RF-${createHash("sha256")
                .update(`${input.providerTxnId}:${input.amountPaisa}:${Date.now()}`)
                .digest("hex")
                .slice(0, 16)
                .toUpperCase()}`,
        };
    }
}

export const getProviderAdapter = (provider: PaymentProvider): PaymentProviderAdapter => {
    // Real adapters are selected here once PAYMENT_PROVIDER_MODE changes from
    // "mock" and credentials are configured.
    return new MockProviderAdapter(provider);
};

export const buildSignedPayload = (
    payload: Record<string, unknown>,
): { rawBody: Buffer; signature: string; body: Record<string, unknown> } => {
    const rawBody = Buffer.from(JSON.stringify(payload), "utf8");
    const signature = signPayload(rawBody);
    return { rawBody, signature, body: payload };
};
