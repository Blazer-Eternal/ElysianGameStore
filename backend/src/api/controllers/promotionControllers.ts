import { Response } from "express";

import { FundedBy } from "../../enums/fundedByEnum";
import { PromotionType } from "../../enums/promotionTypeEnum";
import { AppRequest as Request } from "../../interfaces";
import { asyncHandler } from "../../middleware/exceptionHandler";
import { actorOf } from "../../middleware/guard";
import { promotionServices } from "../../services";
import { sendSuccess } from "../../utils/response";

// ---------------------------------------------------------------------------
// Public
// ---------------------------------------------------------------------------
export const listPublicActive = asyncHandler(async (_req: Request, res: Response) => {
    const promotions = await promotionServices.listPublicActive();
    sendSuccess(res, { promotions });
});

// ---------------------------------------------------------------------------
// Publisher / admin CRUD + game fan-out
// ---------------------------------------------------------------------------
export const listPromotions = asyncHandler(async (req: Request, res: Response) => {
    const promotions = await promotionServices.listForActor(actorOf(req));
    sendSuccess(res, { promotions });
});

export const createPromotion = asyncHandler(async (req: Request, res: Response) => {
    const promotion = await promotionServices.create(
        actorOf(req),
        {
            name: req.body.name,
            type: req.body.type as PromotionType,
            value: req.body.value,
            startsAt: req.body.startsAt,
            endsAt: req.body.endsAt,
            fundedBy: req.body.fundedBy as FundedBy | undefined,
        },
        req.ip,
    );
    sendSuccess(res, { promotion }, "Promotion created", 201);
});

export const updatePromotion = asyncHandler(async (req: Request, res: Response) => {
    const promotion = await promotionServices.update(String(req.params.id), actorOf(req), req.body);
    sendSuccess(res, { promotion }, "Promotion updated");
});

export const deletePromotion = asyncHandler(async (req: Request, res: Response) => {
    await promotionServices.remove(String(req.params.id), actorOf(req), req.ip);
    sendSuccess(res, null, "Promotion deleted");
});

export const attachGame = asyncHandler(async (req: Request, res: Response) => {
    const games = await promotionServices.attachGame(
        String(req.params.id),
        actorOf(req),
        req.body.gameId,
        req.body.discountPct,
    );
    sendSuccess(res, { games }, "Game added to promotion");
});

export const detachGame = asyncHandler(async (req: Request, res: Response) => {
    const games = await promotionServices.detachGame(
        String(req.params.id),
        actorOf(req),
        String(req.params.gameId),
    );
    sendSuccess(res, { games }, "Game removed from promotion");
});

// Wishlist → sale notification fan-out (spec logic #6). Normally driven by the
// in-process scheduler (maintenanceServices); admins can trigger it on demand.
export const runFanout = asyncHandler(async (_req: Request, res: Response) => {
    const processed = await promotionServices.sweepStartingPromotions();
    sendSuccess(res, { processed }, "Promotion fan-out sweep complete");
});
