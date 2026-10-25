import { Response } from "express";

import { ModerationStatus } from "../../enums/moderationStatusEnum";
import { AppRequest as Request } from "../../interfaces";
import { asyncHandler } from "../../middleware/exceptionHandler";
import { reviewServices } from "../../services";
import { sendSuccess } from "../../utils/response";

export const listByGame = asyncHandler(async (req: Request, res: Response) => {
    const q = req.query as Record<string, string | undefined>;
    const result = await reviewServices.listByGame(q.gameId as string, {
        sort: (q.sort as never) ?? "recent",
        page: Number(q.page ?? 1),
        pageSize: Number(q.pageSize ?? 12),
    });
    sendSuccess(res, result);
});

export const createReview = asyncHandler(async (req: Request, res: Response) => {
    const review = await reviewServices.create(req.user!.sub, req.body, req.ip);
    sendSuccess(res, { review }, "Review published", 201);
});

export const updateReview = asyncHandler(async (req: Request, res: Response) => {
    const review = await reviewServices.update(req.user!.sub, req.params.id, req.body);
    sendSuccess(res, { review }, "Review updated");
});

export const deleteReview = asyncHandler(async (req: Request, res: Response) => {
    await reviewServices.remove(req.user!.sub, req.params.id);
    sendSuccess(res, null, "Review deleted");
});

export const markHelpful = asyncHandler(async (req: Request, res: Response) => {
    const review = await reviewServices.markHelpful(req.user!.sub, req.params.id);
    sendSuccess(res, { review }, "Marked helpful");
});

// ---------------------------------------------------------------------------
// Admin — moderation. Hidden (REJECTED) reviews vanish from the public list
// (ReviewRepository.listByGame only ever returns APPROVED rows).
// ---------------------------------------------------------------------------
export const adminModerateReview = asyncHandler(async (req: Request, res: Response) => {
    const review = await reviewServices.moderate(
        String(req.params.id),
        req.user!.sub,
        req.body.moderationStatus as ModerationStatus,
        req.ip,
    );
    sendSuccess(res, { review }, "Review moderation updated");
});
