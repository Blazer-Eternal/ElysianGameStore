import { Router } from "express";

import * as webhookControllers from "../controllers/webhookControllers";

// Payment-provider callbacks. No auth guard: the request is authenticated by
// the HMAC signature, which is computed over the *raw* bytes of the body —
// app.ts captures them into req.rawBody inside express.json's `verify` hook
// before JSON parsing rewrites the object, and webhookControllers passes both
// the raw buffer and the parsed body to the signature check.
const webhookRoutes = Router();

webhookRoutes.post("/:provider", webhookControllers.handleWebhook);

export default webhookRoutes;
