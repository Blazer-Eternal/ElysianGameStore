import { Router } from "express";

import * as promotionControllers from "../controllers/promotionControllers";
import {
    authenticate,
    requireAction,
    requireRole,
    validate,
} from "../../middleware";
import { Role } from "../../enums/roleEnum";
import { Action } from "../../services/accessControl";
import {
    attachPromotionGameSchema,
    createPromotionSchema,
    updatePromotionSchema,
} from "../../validators";

const promotionRoutes = Router();

// Public: what is on sale right now.
promotionRoutes.get("/active", promotionControllers.listPublicActive);

// Publisher / admin CRUD. PROMOTION_MANAGE grants PUBLISHER + ADMIN; the
// service additionally restricts publishers to publisher-funded promotions and
// to promotions they created themselves.
promotionRoutes.get(
    "/",
    authenticate,
    requireAction(Action.PROMOTION_MANAGE),
    promotionControllers.listPromotions,
);
promotionRoutes.post(
    "/",
    authenticate,
    requireAction(Action.PROMOTION_MANAGE),
    validate(createPromotionSchema),
    promotionControllers.createPromotion,
);
promotionRoutes.patch(
    "/:id",
    authenticate,
    requireAction(Action.PROMOTION_MANAGE),
    validate(updatePromotionSchema),
    promotionControllers.updatePromotion,
);
promotionRoutes.delete(
    "/:id",
    authenticate,
    requireAction(Action.PROMOTION_MANAGE),
    promotionControllers.deletePromotion,
);
promotionRoutes.post(
    "/:id/games",
    authenticate,
    requireAction(Action.PROMOTION_MANAGE),
    validate(attachPromotionGameSchema),
    promotionControllers.attachGame,
);
promotionRoutes.delete(
    "/:id/games/:gameId",
    authenticate,
    requireAction(Action.PROMOTION_MANAGE),
    promotionControllers.detachGame,
);

// Admin: run the wishlist → sale notification fan-out on demand (the same
// sweep the in-process scheduler runs automatically).
promotionRoutes.post(
    "/sweep",
    authenticate,
    requireRole(Role.ADMIN),
    promotionControllers.runFanout,
);

export default promotionRoutes;
