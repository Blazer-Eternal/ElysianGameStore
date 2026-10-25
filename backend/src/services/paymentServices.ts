import { randomUUID } from "crypto";

import { Database, paymentConfig } from "../config";
import { PAYMENT_PROVIDERS, PaymentProvider } from "../enums/paymentProviderEnum";
import { PaymentStatus } from "../enums/paymentStatusEnum";
import { IPayment } from "../interfaces/paymentInterface";
import Payment from "../models/paymentModel";
import { CouponRepository, OrderRepository, PaymentRepository } from "../repositories";
import AppError from "../utils/appError";
import { audit, AUDIT_ACTIONS } from "./auditServices";
import { fulfillOrder } from "./licenseServices";
import {
    buildSignedPayload,
    getProviderAdapter,
    InitiateResult,
    PaymentProviderAdapter,
} from "./paymentProviders";

const { sequelize } = Database;

// ---------------------------------------------------------------------------
// Payment initiation. Idempotency-Key (optional) maps a client retry onto the
// same payment row — the same checkout can be initiated twice without ever
// creating two payments.
// ---------------------------------------------------------------------------
export const initiatePayment = async (
    userId: string,
    orderId: string,
    input: { provider: PaymentProvider; returnUrl?: string; idempotencyKey?: string },
): Promise<{ payment: Payment; paymentUrl?: string; payload: Record<string, unknown> }> => {
    if (!PAYMENT_PROVIDERS.includes(input.provider)) {
        throw AppError.badRequest("Unsupported payment provider");
    }
    const order = await OrderRepository.findById(orderId);
    if (!order || order.userId !== userId) throw AppError.notFound("Order not found");
    if (order.status !== "PENDING") {
        throw AppError.conflict(`This order is ${order.status} and cannot be paid`);
    }

    if (input.idempotencyKey) {
        const existing = await PaymentRepository.findByIdempotencyKey(input.idempotencyKey);
        if (existing && existing.orderId === orderId) {
            const adapter = getProviderAdapter(existing.provider);
            const result = await adapter.initiate({
                orderId,
                paymentId: existing.id,
                amountPaisa: existing.amountPaisa,
                returnUrl: input.returnUrl,
                webhookUrl: webhookUrlFor(existing.provider),
            });
            return { payment: existing, paymentUrl: result.paymentUrl, payload: result.payload };
        }
    }

    const payment = await PaymentRepository.create({
        orderId,
        provider: input.provider,
        providerTxnId: null,
        idempotencyKey: input.idempotencyKey ?? null,
        status: PaymentStatus.INITIATED,
        amountPaisa: order.totalPaisa, // amount must equal order total
        rawResponse: null,
    });

    const adapter = getProviderAdapter(input.provider);
    const result: InitiateResult = await adapter.initiate({
        orderId,
        paymentId: payment.id,
        amountPaisa: payment.amountPaisa,
        returnUrl: input.returnUrl,
        webhookUrl: webhookUrlFor(input.provider),
    });

    await PaymentRepository.updateById(payment.id, { rawResponse: result.payload });
    await audit({
        actorId: userId,
        action: AUDIT_ACTIONS.PAYMENT_INITIATED,
        entity: "payment",
        entityId: payment.id,
        diff: { provider: input.provider, amountPaisa: payment.amountPaisa },
    });

    return { payment, paymentUrl: result.paymentUrl, payload: result.payload };
};

const webhookUrlFor = (provider: PaymentProvider): string =>
    `${paymentConfig.mockBaseUrl.replace("/api/orders", "/api/webhooks")}/${provider}`;

// ---------------------------------------------------------------------------
// Webhook processing — the single, idempotent entry point for provider
// callbacks (used by both the HTTP route and the dev simulator).
//
// Guarantees:
//  * signature verified by the provider adapter (HMAC over raw body);
//  * provider_txn_id unique → a replayed callback collapses to no-op;
//  * the order row is locked FOR UPDATE → concurrent callbacks serialize;
//  * licenses/gifts are created only on the first PENDING → PAID transition;
//  * amount must equal the order total or the payment is rejected.
// ---------------------------------------------------------------------------
export interface WebhookOutcome {
    ok: boolean;
    orderStatus: string;
    alreadyProcessed: boolean;
    message: string;
}

export const processProviderCallback = async (params: {
    provider: PaymentProvider;
    rawBody: Buffer | undefined;
    signature: string | undefined;
    body: Record<string, unknown>;
    ip?: string;
}): Promise<WebhookOutcome> => {
    const adapter: PaymentProviderAdapter = getProviderAdapter(params.provider);
    const verified = await adapter.verify(params.rawBody, params.signature, params.body);
    if (!verified.ok) throw AppError.unauthorized("Invalid webhook signature");
    if (!verified.orderId || !verified.providerTxnId) {
        throw AppError.badRequest("Webhook payload is missing order_id or transaction_id");
    }

    return sequelize.transaction(async (t) => {
        const order = await OrderRepository.lockById(verified.orderId, t);
        if (!order) throw AppError.notFound("Order not found");

        // Replay of an already-applied transaction → no-op success.
        const existingTxn = await PaymentRepository.findByProviderTxnId(verified.providerTxnId);
        if (existingTxn) {
            return {
                ok: true,
                orderStatus: order.status,
                alreadyProcessed: true,
                message: "Transaction already processed",
            };
        }

        // Stamp the provider transaction id onto the payment created at
        // initiate time (or create a row for provider-initiated flows).
        const payments = await PaymentRepository.findByOrderId(order.id);
        const openPayment =
            payments.find(
                (p) =>
                    p.provider === params.provider &&
                    !p.providerTxnId &&
                    (p.status === PaymentStatus.INITIATED || p.status === PaymentStatus.PENDING),
            ) ?? null;

        const payment: IPayment =
            openPayment ??
            (await PaymentRepository.create(
                {
                    orderId: order.id,
                    provider: params.provider,
                    providerTxnId: null,
                    idempotencyKey: null,
                    status: PaymentStatus.PENDING,
                    amountPaisa: verified.amountPaisa || order.totalPaisa,
                    rawResponse: null,
                },
                t,
            ));

        // Order already PAID (e.g. two different txn ids for one order):
        // record the transaction but never fulfil twice.
        if (order.status === "PAID" || order.status === "REFUNDED" || order.status === "PARTIAL_REFUND") {
            await PaymentRepository.updateById(
                payment.id,
                { providerTxnId: verified.providerTxnId, rawResponse: verified.raw },
                t,
            );
            return {
                ok: true,
                orderStatus: order.status,
                alreadyProcessed: true,
                message: "Order already settled",
            };
        }

        if (verified.status !== "SUCCESS") {
            await PaymentRepository.updateById(
                payment.id,
                {
                    providerTxnId: verified.providerTxnId,
                    status: PaymentStatus.FAILED,
                    rawResponse: verified.raw,
                },
                t,
            );
            await OrderRepository.updateById(order.id, { status: "FAILED" as never }, t);
            if (order.couponId) await CouponRepository.releaseAtomic(order.couponId, t);
            await audit({
                action: AUDIT_ACTIONS.ORDER_PAYMENT_FAILED,
                entity: "order",
                entityId: order.id,
                diff: { provider: params.provider },
                ip: params.ip,
                transaction: t,
            });
            return {
                ok: true,
                orderStatus: "FAILED",
                alreadyProcessed: false,
                message: "Payment failed",
            };
        }

        // Amount check: the provider says the payer paid exactly this much.
        if (verified.amountPaisa !== order.totalPaisa) {
            await PaymentRepository.updateById(
                payment.id,
                {
                    providerTxnId: verified.providerTxnId,
                    status: PaymentStatus.FAILED,
                    rawResponse: { ...verified.raw, mismatch: true },
                },
                t,
            );
            await OrderRepository.updateById(order.id, { status: "FAILED" as never }, t);
            if (order.couponId) await CouponRepository.releaseAtomic(order.couponId, t);
            await audit({
                action: "PAYMENT_AMOUNT_MISMATCH",
                entity: "order",
                entityId: order.id,
                diff: { expected: order.totalPaisa, received: verified.amountPaisa },
                ip: params.ip,
                transaction: t,
            });
            return {
                ok: false,
                orderStatus: "FAILED",
                alreadyProcessed: false,
                message: "Amount mismatch — payment rejected",
            };
        }

        // ---- First successful transition: mark PAID and fulfil exactly once ----
        await OrderRepository.updateById(
            order.id,
            { status: "PAID" as never, paidAt: new Date() },
            t,
        );
        await PaymentRepository.updateById(
            payment.id,
            { providerTxnId: verified.providerTxnId, status: PaymentStatus.PAID, rawResponse: verified.raw },
            t,
        );

        // Pass the model instance itself: spreading a Sequelize instance
        // ({ ...order }) drops the attribute getters, so id/userId/
        // giftRecipientEmail came back undefined and fulfilment crashed with
        // "WHERE parameter order_id has invalid undefined value" — every
        // successful payment would roll back. fulfilOrder does not read
        // status, so the in-memory (not yet refreshed) value is irrelevant.
        await fulfillOrder(order, t);

        await audit({
            action: AUDIT_ACTIONS.ORDER_PAID,
            entity: "order",
            entityId: order.id,
            diff: { totalPaisa: order.totalPaisa, provider: params.provider },
            ip: params.ip,
            transaction: t,
        });

        return {
            ok: true,
            orderStatus: "PAID",
            alreadyProcessed: false,
            message: "Payment verified, order fulfilled",
        };
    });
};

// ---------------------------------------------------------------------------
// Dev-only simulator: builds a correctly signed provider callback and pushes
// it through processProviderCallback — the exact code path the real webhook
// uses. Guarded by ENABLE_MOCK_PAYMENTS.
// ---------------------------------------------------------------------------
export const simulatePayment = async (
    userId: string,
    orderId: string,
    input: { provider?: PaymentProvider; status?: "SUCCESS" | "FAILURE" },
): Promise<WebhookOutcome> => {
    if (!paymentConfig.enableMockPayments) {
        throw AppError.forbidden("Mock payments are disabled on this server");
    }
    const order = await OrderRepository.findById(orderId);
    if (!order || order.userId !== userId) throw AppError.notFound("Order not found");
    if (order.status !== "PENDING") {
        throw AppError.conflict(`This order is ${order.status}`);
    }

    const payments = await PaymentRepository.findByOrderId(orderId);
    const provider = input.provider ?? payments[0]?.provider ?? PaymentProvider.ESEWA;

    const payload = {
        order_id: orderId,
        transaction_id: `MOCK-${randomUUID()}`,
        status: input.status ?? "SUCCESS",
        amount_paisa: order.totalPaisa,
        provider,
    };
    const { rawBody, signature, body } = buildSignedPayload(payload);
    return processProviderCallback({ provider, rawBody, signature, body });
};
