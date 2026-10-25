import { Router } from "express";

import * as couponControllers from "../controllers/couponControllers";
import { authenticate, optionalAuth, requireAction, validate } from "../../middleware";
import { Action } from "../../services/accessControl";
import { createCouponSchema, updateCouponSchema } from "../../validators";

const couponRoutes = Router();

// Public-ish preview: re-runs the server-side quote with the code applied so
// the checkout screen shows the exact paisa figures it would charge. Prices a
// logged-in user sees are personalised (owned games), hence optional auth.
// Coupon rules themselves are enforced by pricingServices, not by the client.
couponRoutes.post("/preview", optionalAuth, couponControllers.previewCoupon);

// Admin CRUD (COUPON_MANAGE resolves to ADMIN).
couponRoutes.get("/", authenticate, requireAction(Action.COUPON_MANAGE), couponControllers.listCoupons);
couponRoutes.post(
    "/",
    authenticate,
    requireAction(Action.COUPON_MANAGE),
    validate(createCouponSchema),
    couponControllers.createCoupon,
);
couponRoutes.patch(
    "/:id",
    authenticate,
    requireAction(Action.COUPON_MANAGE),
    validate(updateCouponSchema),
    couponControllers.updateCoupon,
);
couponRoutes.delete(
    "/:id",
    authenticate,
    requireAction(Action.COUPON_MANAGE),
    couponControllers.deleteCoupon,
);

export default couponRoutes;
