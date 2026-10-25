import { Response } from "express";

import { AppRequest as Request } from "../../interfaces";
import { asyncHandler } from "../../middleware/exceptionHandler";
import { giftServices } from "../../services";
import { sendSuccess } from "../../utils/response";

export const listMine = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user!;
    const result = await giftServices.listMine(user.sub, user.email);
    sendSuccess(res, result);
});

export const preview = asyncHandler(async (req: Request, res: Response) => {
    const gift = await giftServices.preview(req.params.token);
    sendSuccess(res, { gift });
});

export const redeem = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user!;
    const gift = await giftServices.redeem(user.sub, user.email, req.body.token, req.ip);
    sendSuccess(res, { gift }, "Gift redeemed");
});
