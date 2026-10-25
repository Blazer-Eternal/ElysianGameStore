import { Router } from "express";

import * as publisherControllers from "../controllers/publisherControllers";
import { authenticate, requireRole, validate } from "../../middleware";
import { Role } from "../../enums/roleEnum";
import {
    applyPublisherSchema,
    generatePayoutSchema,
    pageQuerySchema,
    updatePublisherSchema,
} from "../../validators";

// Publisher application, profile and the publisher-side payout surface. The
// controllers resolve the owned publisher row themselves (requireOwnedPublisher
//), so a role guard here only keeps customers from reaching them: a 403 at the
// door instead of a 404 deep inside.
const publisherRoutes = Router();

publisherRoutes.post("/apply", authenticate, validate(applyPublisherSchema), publisherControllers.applyPublisher);
publisherRoutes.get("/me", authenticate, publisherControllers.getMyPublisher);
publisherRoutes.patch("/me", authenticate, validate(updatePublisherSchema), publisherControllers.updateMyPublisher);

// Payouts — integer paisa, hold period enforced by payoutServices.
publisherRoutes.post(
    "/payouts/preview",
    authenticate,
    requireRole(Role.PUBLISHER, Role.ADMIN),
    validate(generatePayoutSchema),
    publisherControllers.previewPayout,
);
publisherRoutes.post(
    "/payouts/generate",
    authenticate,
    requireRole(Role.PUBLISHER, Role.ADMIN),
    validate(generatePayoutSchema),
    publisherControllers.generatePayout,
);
publisherRoutes.get(
    "/payouts",
    authenticate,
    requireRole(Role.PUBLISHER, Role.ADMIN),
    validate(pageQuerySchema, "query"),
    publisherControllers.listMyPayouts,
);

export default publisherRoutes;
