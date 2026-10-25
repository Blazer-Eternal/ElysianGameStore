import { Router } from "express";

import * as dashboardControllers from "../controllers/dashboardControllers";
import { authenticate, requireAction, requireRole, validate } from "../../middleware";
import { wishlistConversionQuerySchema } from "../../validators";
import { Role } from "../../enums/roleEnum";
import { Action } from "../../services/accessControl";

// Read-only aggregates. Whose stats are shown is decided in the controllers
// (admin = everything, publisher = their own publisher row).
const dashboardRoutes = Router();

dashboardRoutes.get("/admin", authenticate, requireAction(Action.DASHBOARD_ADMIN), dashboardControllers.getAdminDashboard);
dashboardRoutes.get(
    "/publisher",
    authenticate,
    requireRole(Role.PUBLISHER, Role.ADMIN),
    dashboardControllers.getPublisherDashboard,
);
// Wishlist → sale conversion stats (optionally scoped to one promotion).
dashboardRoutes.get(
    "/wishlist-conversion",
    authenticate,
    requireRole(Role.ADMIN),
    validate(wishlistConversionQuerySchema, "query"),
    dashboardControllers.getWishlistConversion,
);

export default dashboardRoutes;
