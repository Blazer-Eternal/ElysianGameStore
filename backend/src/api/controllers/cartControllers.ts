import { Response } from "express";

import { AppRequest as Request } from "../../interfaces";
import { asyncHandler } from "../../middleware/exceptionHandler";
import { cartServices } from "../../services";
import { sendSuccess } from "../../utils/response";

export const getCart = asyncHandler(async (req: Request, res: Response) => {
    const cart = await cartServices.getCart(req.user!.sub);
    sendSuccess(res, cart);
});

export const addItem = asyncHandler(async (req: Request, res: Response) => {
    const result = await cartServices.addItem(req.user!.sub, req.body.gameId, req.ip);
    sendSuccess(res, result, "Added to cart", 201);
});

export const removeItem = asyncHandler(async (req: Request, res: Response) => {
    const cart = await cartServices.removeItem(req.user!.sub, req.params.gameId);
    sendSuccess(res, cart, "Removed from cart");
});

export const clearCart = asyncHandler(async (req: Request, res: Response) => {
    await cartServices.clear(req.user!.sub);
    sendSuccess(res, null, "Cart cleared");
});
