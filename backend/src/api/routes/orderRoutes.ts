import { Router } from "express";

import * as orderControllers from "../controllers/orderControllers";
import * as webhookControllers from "../controllers/webhookControllers";
import { authenticate, sensitiveLimiter, validate } from "../../middleware";
import {
    createOrderSchema,
    listOrdersQuerySchema,
    paySchema,
    quoteSchema,
    simulatePaymentSchema,
} from "../../validators";

// Checkout flow: quote → create → pay → (webhook marks it paid). Every route
// is scoped to req.user.sub inside the controllers, so authenticate is the
// only guard needed here; admin-side order tools would live under /admin.
const orderRoutes = Router();

orderRoutes.post("/quote", authenticate, validate(quoteSchema), orderControllers.quote);
orderRoutes.post("/", authenticate, validate(createOrderSchema), orderControllers.createOrder);
orderRoutes.get("/", authenticate, validate(listOrdersQuerySchema, "query"), orderControllers.listOrders);
orderRoutes.get("/:id", authenticate, orderControllers.getOrder);

// Payment initiation is money-moving and therefore rate limited on the strict
// sensitive bucket (in addition to the per-IP global limiter).
orderRoutes.post(
    "/:id/pay",
    authenticate,
    sensitiveLimiter,
    validate(paySchema),
    orderControllers.pay,
);

orderRoutes.post("/:id/cancel", authenticate, orderControllers.cancelOrder);
orderRoutes.post(
    "/:id/simulate",
    authenticate,
    validate(simulatePaymentSchema),
    orderControllers.simulatePayment,
);

// Dev-only hosted-checkout page (no auth: it is a plain browser page) that
// POSTs a correctly signed callback to /api/webhooks/:provider. The controller
// itself refuses to render unless ENABLE_MOCK_PAYMENTS is on.
orderRoutes.get("/:id/mock-checkout", webhookControllers.mockCheckout);

export default orderRoutes;
