import { Router } from "express";

import * as paymentControllers from "../controllers/paymentControllers";
import { authenticate } from "../../middleware";

// Read-only payment surface: provider discovery for the checkout screen and
// order-status polling. Initiation lives in orderRoutes (POST /orders/:id/pay).
const paymentRoutes = Router();

paymentRoutes.get("/providers", paymentControllers.listProviders);
paymentRoutes.get("/orders/:orderId/status", authenticate, paymentControllers.getPaymentStatus);

export default paymentRoutes;
