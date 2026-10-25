import { Response } from "express";

import { PayoutCurrency } from "../../enums/payoutCurrencyEnum";
import { PayoutStatus } from "../../enums/payoutStatusEnum";
import { PublisherStatus } from "../../enums/publisherStatusEnum";
import { AppRequest as Request } from "../../interfaces";
import { asyncHandler } from "../../middleware/exceptionHandler";
import { actorOf } from "../../middleware/guard";
import { payoutServices, publisherServices } from "../../services";
import { sendSuccess } from "../../utils/response";

// ---------------------------------------------------------------------------
// Publisher application & profile
// ---------------------------------------------------------------------------
export const applyPublisher = asyncHandler(async (req: Request, res: Response) => {
    const publisher = await publisherServices.apply(
        req.user!.sub,
        { ...req.body, payoutCurrency: req.body.payoutCurrency as PayoutCurrency | undefined },
        req.ip,
    );
    sendSuccess(res, { publisher }, "Publisher application received", 201);
});

export const getMyPublisher = asyncHandler(async (req: Request, res: Response) => {
    const publisher = await publisherServices.getMine(req.user!.sub);
    sendSuccess(res, { publisher });
});

export const updateMyPublisher = asyncHandler(async (req: Request, res: Response) => {
    const publisher = await publisherServices.updateMine(
        req.user!.sub,
        { ...req.body, payoutCurrency: req.body.payoutCurrency as PayoutCurrency | undefined },
        req.ip,
    );
    sendSuccess(res, { publisher }, "Publisher profile updated");
});

// ---------------------------------------------------------------------------
// Payouts (publisher side)
// ---------------------------------------------------------------------------
export const previewPayout = asyncHandler(async (req: Request, res: Response) => {
    const publisher = await publisherServices.requireOwnedPublisher(req.user!.sub);
    const result = await payoutServices.preview(
        publisher.id,
        req.body.periodStart,
        req.body.periodEnd,
    );
    sendSuccess(res, result);
});

export const generatePayout = asyncHandler(async (req: Request, res: Response) => {
    const publisher = await publisherServices.requireOwnedPublisher(req.user!.sub);
    const result = await payoutServices.generate(
        publisher.id,
        req.user!.sub,
        req.body.periodStart,
        req.body.periodEnd,
        req.ip,
    );
    sendSuccess(res, result, "Payout generated", 201);
});

export const listMyPayouts = asyncHandler(async (req: Request, res: Response) => {
    const publisher = await publisherServices.requireOwnedPublisher(req.user!.sub);
    const q = req.query as Record<string, string | undefined>;
    const result = await payoutServices.listMine(
        publisher.id,
        Number(q.page ?? 1),
        Number(q.pageSize ?? 12),
    );
    sendSuccess(res, result);
});

// ---------------------------------------------------------------------------
// Admin — publishers
// ---------------------------------------------------------------------------
export const adminListPublishers = asyncHandler(async (req: Request, res: Response) => {
    const q = req.query as Record<string, string | undefined>;
    const result = await publisherServices.adminList({
        status: q.status as PublisherStatus | undefined,
        page: Number(q.page ?? 1),
        pageSize: Number(q.pageSize ?? 12),
    });
    sendSuccess(res, result);
});

export const adminSetPublisherStatus = asyncHandler(async (req: Request, res: Response) => {
    const publisher = await publisherServices.adminSetStatus(
        String(req.params.id),
        req.body.status as PublisherStatus,
        req.user!.sub,
        req.ip,
    );
    sendSuccess(res, { publisher }, "Publisher status updated");
});

// ---------------------------------------------------------------------------
// Admin — payouts
// ---------------------------------------------------------------------------
export const adminListPayouts = asyncHandler(async (req: Request, res: Response) => {
    const q = req.query as Record<string, string | undefined>;
    const result = await payoutServices.adminList(
        q.status,
        Number(q.page ?? 1),
        Number(q.pageSize ?? 12),
    );
    sendSuccess(res, result);
});

export const adminSetPayoutStatus = asyncHandler(async (req: Request, res: Response) => {
    const payout = await payoutServices.adminSetStatus(
        String(req.params.id),
        req.user!.sub,
        req.body.status as PayoutStatus,
        req.ip,
    );
    sendSuccess(
        res,
        { payout },
        req.body.status === PayoutStatus.PAID ? "Payout released" : "Payout updated",
    );
});
