import { Response } from "express";

import { AppRequest as Request } from "../../interfaces";
import { asyncHandler } from "../../middleware/exceptionHandler";
import { wishlistServices } from "../../services";
import { sendSuccess } from "../../utils/response";

export const list = asyncHandler(async (req: Request, res: Response) => {
    const q = req.query as Record<string, string | undefined>;
    const result = await wishlistServices.list(req.user!.sub, {
        page: Number(q.page ?? 1),
        pageSize: Number(q.pageSize ?? 12),
    });
    sendSuccess(res, result);
});

export const add = asyncHandler(async (req: Request, res: Response) => {
    const result = await wishlistServices.add(req.user!.sub, req.body.gameId);
    sendSuccess(res, result, "Added to wishlist", 201);
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
    await wishlistServices.remove(req.user!.sub, req.params.gameId);
    sendSuccess(res, null, "Removed from wishlist");
});
