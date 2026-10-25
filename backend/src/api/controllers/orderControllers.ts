import { Response } from "express";

import { PaymentProvider } from "../../enums/paymentProviderEnum";
import { AppRequest as Request } from "../../interfaces";
import { asyncHandler } from "../../middleware/exceptionHandler";
import { checkoutServices, paymentServices } from "../../services";
import { OrderRepository } from "../../repositories";
import AppError from "../../utils/appError";
import { sendSuccess } from "../../utils/response";

export const quote = asyncHandler(async (req: Request, res: Response) => {
    const result = await checkoutServices.getQuoteOnly(req.user!.sub, req.body);
    sendSuccess(res, result);
});

export const createOrder = asyncHandler(async (req: Request, res: Response) => {
    const { orderId, quote } = await checkoutServices.createOrder(req.user!.sub, req.body, req.ip);
    sendSuccess(res, { orderId, quote }, "Order created", 201);
});

export const listOrders = asyncHandler(async (req: Request, res: Response) => {
    const q = req.query as Record<string, string | undefined>;
    const { rows, count } = await OrderRepository.listByUser(req.user!.sub, {
        status: q.status,
        limit: Number(q.pageSize ?? 12),
        offset: (Number(q.page ?? 1) - 1) * Number(q.pageSize ?? 12),
    });
    sendSuccess(res, {
        orders: rows,
        total: count,
        page: Number(q.page ?? 1),
        pageSize: Number(q.pageSize ?? 12),
    });
});

export const getOrder = asyncHandler(async (req: Request, res: Response) => {
    const order = await OrderRepository.findByIdWithItems(req.params.id);
    if (!order || order.userId !== req.user!.sub) throw AppError.notFound("Order not found");
    sendSuccess(res, { order });
});

export const pay = asyncHandler(async (req: Request, res: Response) => {
    const result = await paymentServices.initiatePayment(req.user!.sub, req.params.id, {
        provider: req.body.provider as PaymentProvider,
        returnUrl: req.body.returnUrl,
        idempotencyKey: req.body.idempotencyKey ?? (req.headers["idempotency-key"] as string | undefined),
    });
    sendSuccess(res, {
        payment: { id: result.payment.id, status: result.payment.status, amountPaisa: result.payment.amountPaisa },
        paymentUrl: result.paymentUrl,
        payload: result.payload,
    }, "Payment initiated");
});

export const cancelOrder = asyncHandler(async (req: Request, res: Response) => {
    const order = await checkoutServices.cancelOrder(req.user!.sub, req.params.id, req.ip);
    sendSuccess(res, { order }, "Order cancelled");
});

// Dev-only: simulates the provider callback through the identical webhook
// code path (signature included). Guarded by ENABLE_MOCK_PAYMENTS.
export const simulatePayment = asyncHandler(async (req: Request, res: Response) => {
    const outcome = await paymentServices.simulatePayment(req.user!.sub, req.params.id, {
        provider: req.body.provider as PaymentProvider | undefined,
        status: req.body.status as "SUCCESS" | "FAILURE" | undefined,
    });
    sendSuccess(res, outcome, "Simulation complete");
});
