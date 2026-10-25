import { Response } from "express";

import { Platform } from "../../enums/platformEnum";
import { AppRequest as Request } from "../../interfaces";
import { asyncHandler } from "../../middleware/exceptionHandler";
import { licenseServices } from "../../services";
import { sendSuccess } from "../../utils/response";

export const getLibrary = asyncHandler(async (req: Request, res: Response) => {
    const q = req.query as Record<string, string | boolean | undefined>;
    const result = await licenseServices.getLibrary(req.user!.sub, {
        includeRevoked: q.includeRevoked === true,
        page: Number(q.page ?? 1),
        pageSize: Number(q.pageSize ?? 12),
    });
    sendSuccess(res, result);
});

export const download = asyncHandler(async (req: Request, res: Response) => {
    const platform = String(req.query.platform ?? "WINDOWS") as Platform;
    const result = await licenseServices.getDownload(req.user!.sub, req.params.gameId, platform);
    sendSuccess(res, result, "Signed download URL issued");
});
