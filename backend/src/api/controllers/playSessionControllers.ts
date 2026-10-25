import { Response } from "express";

import { AppRequest as Request } from "../../interfaces";
import { asyncHandler } from "../../middleware/exceptionHandler";
import { playSessionServices } from "../../services";
import { sendSuccess } from "../../utils/response";

// Play sessions feed the refund eligibility check ("hours played") and review
// playtime snapshots. Starting requires the license; stop closes the row and
// reports whole minutes played (integer, never float).
export const startSession = asyncHandler(async (req: Request, res: Response) => {
    const session = await playSessionServices.start(req.user!.sub, req.body.gameId);
    sendSuccess(res, { session }, "Session started", 201);
});

export const stopSession = asyncHandler(async (req: Request, res: Response) => {
    const result = await playSessionServices.stop(req.user!.sub, String(req.params.id));
    sendSuccess(res, result, "Session stopped");
});

export const getPlaytime = asyncHandler(async (req: Request, res: Response) => {
    const minutesPlayed = await playSessionServices.totalPlaytimeMinutes(
        req.user!.sub,
        String(req.params.gameId),
    );
    sendSuccess(res, { minutesPlayed });
});
