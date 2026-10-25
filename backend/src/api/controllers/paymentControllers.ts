import { Response } from "express";

import { PAYMENT_PROVIDERS } from "../../enums/paymentProviderEnum";
import { AppRequest as Request } from "../../interfaces";
import { asyncHandler } from "../../middleware/exceptionHandler";
import { OrderRepository, PaymentRepository } from "../../repositories";
import AppError from "../../utils/appError";
import { sendSuccess } from "../../utils/response";

// Payment initiation (POST /orders/:id/pay), the dev simulator and the signed
// mock-checkout page live in orderControllers; provider callbacks live in
// webhookControllers. This file only adds the read-only payment surface:
// provider discovery for the checkout screen and status polling.

export const listProviders = asyncHandler(async (_req: Request, res: Response) => {
    sendSuccess(res, { providers: PAYMENT_PROVIDERS });
});

// Poll: order status + every payment row recorded for it. Amounts stay
// integer paisa all the way through.
export const getPaymentStatus = asyncHandler(async (req: Request, res: Response) => {
    const orderId = String(req.params.orderId);
    const order = await OrderRepository.findById(orderId);
    if (!order || order.userId !== req.user!.sub) throw AppError.notFound("Order not found");
    const payments = await PaymentRepository.findByOrderId(orderId);
    sendSuccess(res, {
        orderStatus: order.status,
        paidAt: order.paidAt,
        payments: payments.map((p) => ({
            id: p.id,
            provider: p.provider,
            status: p.status,
            amountPaisa: p.amountPaisa,
            providerTxnId: p.providerTxnId,
        })),
    });
});
