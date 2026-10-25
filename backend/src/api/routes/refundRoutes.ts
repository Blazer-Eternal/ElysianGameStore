import { Router } from "express";

import * as refundControllers from "../controllers/refundControllers";
import { authenticate, validate } from "../../middleware";
import { requestRefundSchema } from "../../validators";

// Customer-facing refund surface. The eligibility check (refund window in days
// + playtime in minutes) runs before a request is accepted. Admin decisions on
// PENDING requests live under /api/admin/refunds (see adminRoutes).
const refundRoutes = Router();

refundRoutes.post("/", authenticate, validate(requestRefundSchema), refundControllers.requestRefund);
refundRoutes.get("/mine", authenticate, refundControllers.myRefunds);
refundRoutes.get("/:orderItemId/eligibility", authenticate, refundControllers.eligibility);

export default refundRoutes;
