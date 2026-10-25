import { Response } from "express";

import { AppRequest as Request } from "../../interfaces";
import { asyncHandler } from "../../middleware/exceptionHandler";
import { actorOf } from "../../middleware/guard";
import { dashboardServices, publisherServices } from "../../services";
import { sendSuccess } from "../../utils/response";

// Read-only aggregates. Scope decisions (whose stats) happen here via the
// owned-publisher lookup; route-level guards enforce ADMIN / PUBLISHER.
export const getAdminDashboard = asyncHandler(async (_req: Request, res: Response) => {
    const data = await dashboardServices.adminDashboard();
    sendSuccess(res, data);
});

export const getPublisherDashboard = asyncHandler(async (req: Request, res: Response) => {
    const publisher = await publisherServices.requireOwnedPublisher(actorOf(req).id);
    const data = await dashboardServices.publisherDashboard(publisher.id);
    sendSuccess(res, data);
});

// Wishlist → sale conversion stats (optionally scoped to one promotion).
export const getWishlistConversion = asyncHandler(async (req: Request, res: Response) => {
    const q = req.query as Record<string, string | undefined>;
    const stats = await dashboardServices.wishlistConversion(q.promotionId);
    sendSuccess(res, stats);
});
