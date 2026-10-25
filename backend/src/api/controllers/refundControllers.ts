import { Response } from "express";

import { AppRequest as Request } from "../../interfaces";
import { asyncHandler } from "../../middleware/exceptionHandler";
import { refundServices } from "../../services";
import { sendSuccess } from "../../utils/response";

export const requestRefund = asyncHandler(async (req: Request, res: Response) => {
    const result = await refundServices.requestRefund(req.user!.sub, req.body, req.ip);
    sendSuccess(res, result, "Refund request received", 201);
});

export const myRefunds = asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(res, { refunds: await refundServices.myRefunds(req.user!.sub) });
});

export const eligibility = asyncHandler(async (req: Request, res: Response) => {
    const result = await refundServices.getEligibilityForItem(req.user!.sub, req.params.orderItemId);
    sendSuccess(res, result);
});

// ---------------------------------------------------------------------------
// Admin — refund decisions. PENDING requests (those that failed the smart
// policy) wait here; approval goes through refundServices.executeRefund so the
// money move, entitlement revocation and order status all happen in one
// transaction, exactly like an auto-approved refund.
// ---------------------------------------------------------------------------
export const adminListRefunds = asyncHandler(async (req: Request, res: Response) => {
    const q = req.query as Record<string, string | undefined>;
    const result = await refundServices.adminList(
        q.status,
        Number(q.page ?? 1),
        Number(q.pageSize ?? 12),
    );
    sendSuccess(res, result);
});

export const adminDecideRefund = asyncHandler(async (req: Request, res: Response) => {
    const decision: "APPROVE" | "REJECT" = req.body.decision;
    const result = await refundServices.adminDecide(
        String(req.params.id),
        req.user!.sub,
        decision,
        req.ip,
    );
    sendSuccess(res, result, decision === "APPROVE" ? "Refund approved" : "Refund rejected");
});
