import { Router } from "express";

import * as giftControllers from "../controllers/giftControllers";
import { authenticate, validate } from "../../middleware";
import { redeemGiftSchema } from "../../validators";

// "/mine" and "/redeem" are literals, so they must precede "/:token" — a gift
// link is redeemed with its token, but the preview by token is public (the
// recipient may not have an account yet).
const giftRoutes = Router();

giftRoutes.get("/mine", authenticate, giftControllers.listMine);
giftRoutes.post("/redeem", authenticate, validate(redeemGiftSchema), giftControllers.redeem);
giftRoutes.get("/:token", giftControllers.preview);

export default giftRoutes;
