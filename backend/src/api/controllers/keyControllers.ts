import { Response } from "express";

import { Role } from "../../enums/roleEnum";
import { AppRequest as Request } from "../../interfaces";
import { asyncHandler } from "../../middleware/exceptionHandler";
import { actorOf } from "../../middleware/guard";
import { GameRepository } from "../../repositories";
import { gameKeyServices, publisherServices } from "../../services";
import AppError from "../../utils/appError";
import { sendSuccess } from "../../utils/response";

// Key management is scoped to the owning publisher (admins may manage any
// game). Plaintext keys exist only in the generate response — the database
// stores SHA-256 hashes, so there is deliberately no "reveal by id" route.
const assertGameAccess = async (
    actor: { id: string; role: Role },
    gameId: string,
): Promise<void> => {
    if (actor.role === Role.ADMIN) return;
    const game = await GameRepository.findById(gameId);
    if (!game) throw AppError.notFound("Game not found");
    const publisher = await publisherServices.requireOwnedPublisher(actor.id);
    if (game.publisherId !== publisher.id) {
        throw AppError.forbidden("You can only manage keys for your own games");
    }
};

// ---------------------------------------------------------------------------
// Customer
// ---------------------------------------------------------------------------
export const redeemKey = asyncHandler(async (req: Request, res: Response) => {
    const result = await gameKeyServices.redeem(req.user!.sub, req.body.code, req.ip);
    sendSuccess(res, result, "Key redeemed");
});

// ---------------------------------------------------------------------------
// Publisher / admin
// ---------------------------------------------------------------------------
export const generateKeys = asyncHandler(async (req: Request, res: Response) => {
    const gameId = String(req.params.id);
    const actor = actorOf(req);
    await assertGameAccess(actor, gameId);
    const result = await gameKeyServices.generate(gameId, req.body.count);
    sendSuccess(res, result, "Keys generated", 201);
});

export const listKeys = asyncHandler(async (req: Request, res: Response) => {
    const gameId = String(req.params.id);
    const actor = actorOf(req);
    await assertGameAccess(actor, gameId);
    const q = req.query as Record<string, string | undefined>;
    const keys = await gameKeyServices.listForGame(gameId, q.status);
    sendSuccess(res, { keys });
});

export const keySummary = asyncHandler(async (req: Request, res: Response) => {
    const gameId = String(req.params.id);
    const actor = actorOf(req);
    await assertGameAccess(actor, gameId);
    const summary = await gameKeyServices.summaryForGame(gameId);
    sendSuccess(res, { summary });
});
