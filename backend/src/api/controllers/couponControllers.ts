import { Response } from "express";

import { DiscountType } from "../../enums/discountTypeEnum";
import { AppRequest as Request } from "../../interfaces";
import { asyncHandler } from "../../middleware/exceptionHandler";
import { couponServices, pricingServices } from "../../services";
import { sendSuccess } from "../../utils/response";

// ---------------------------------------------------------------------------
// Public preview / validation. Coupon rules (expiry, caps, min order,
// per-user limit) live in the pricing engine, so the preview endpoint simply
// re-runs the server-side quote with the code applied — the exact numbers
// checkout would charge. No float math: every figure is integer paisa.
// ---------------------------------------------------------------------------
export const previewCoupon = asyncHandler(async (req: Request, res: Response) => {
    const quote = await pricingServices.computeQuote({
        gameIds: req.body.gameIds,
        couponCode: req.body.code,
        userId: req.user?.sub,
    });
    sendSuccess(res, {
        valid: true,
        couponDiscountPaisa: quote.couponDiscountPaisa,
        quote,
    });
});

// ---------------------------------------------------------------------------
// Admin CRUD
// ---------------------------------------------------------------------------
export const listCoupons = asyncHandler(async (_req: Request, res: Response) => {
    const coupons = await couponServices.listAll();
    sendSuccess(res, { coupons });
});

export const createCoupon = asyncHandler(async (req: Request, res: Response) => {
    const coupon = await couponServices.create(
        req.user!.sub,
        { ...req.body, discountType: req.body.discountType as DiscountType },
        req.ip,
    );
    sendSuccess(res, { coupon }, "Coupon created", 201);
});

export const updateCoupon = asyncHandler(async (req: Request, res: Response) => {
    const coupon = await couponServices.update(
        req.user!.sub,
        String(req.params.id),
        req.body,
        req.ip,
    );
    sendSuccess(res, { coupon }, "Coupon updated");
});

export const deleteCoupon = asyncHandler(async (req: Request, res: Response) => {
    await couponServices.remove(req.user!.sub, String(req.params.id), req.ip);
    sendSuccess(res, null, "Coupon deleted");
});
