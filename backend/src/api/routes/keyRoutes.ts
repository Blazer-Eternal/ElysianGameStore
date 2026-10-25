import { Router } from "express";

import * as keyControllers from "../controllers/keyControllers";
import { authenticate, requireAction, validate } from "../../middleware";
import { Action } from "../../services/accessControl";
import { generateKeysSchema, listKeysQuerySchema, redeemKeySchema } from "../../validators";

// Two audiences: customers redeem codes, publishers (or admins) generate and
// inspect keys for their games. The game-scoped paths reuse the /games prefix
// but belong to this domain, so the router is mounted at "/" in routes/index.
// Plaintext keys only exist in the generate response — the DB stores hashes.
const keyRoutes = Router();

// Customer
keyRoutes.post("/keys/redeem", authenticate, validate(redeemKeySchema), keyControllers.redeemKey);

// Publisher / admin (ownership of the game is asserted in the controller)
keyRoutes.get(
    "/games/:id/keys",
    authenticate,
    requireAction(Action.KEY_MANAGE),
    validate(listKeysQuerySchema, "query"),
    keyControllers.listKeys,
);
keyRoutes.get(
    "/games/:id/keys/summary",
    authenticate,
    requireAction(Action.KEY_MANAGE),
    keyControllers.keySummary,
);
keyRoutes.post(
    "/games/:id/keys",
    authenticate,
    requireAction(Action.KEY_MANAGE),
    validate(generateKeysSchema),
    keyControllers.generateKeys,
);

export default keyRoutes;
