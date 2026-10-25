import { Router } from "express";

import * as libraryControllers from "../controllers/libraryControllers";
import { authenticate, validate } from "../../middleware";
import { downloadQuerySchema, libraryQuerySchema } from "../../validators";

// Owned games + short-lived signed CDN download URLs. Licences are checked
// server-side; the signed URL itself expires in cdnConfig.signTtlSec seconds.
const libraryRoutes = Router();

libraryRoutes.get("/", authenticate, validate(libraryQuerySchema, "query"), libraryControllers.getLibrary);
libraryRoutes.get(
    "/:gameId/download",
    authenticate,
    validate(downloadQuerySchema, "query"),
    libraryControllers.download,
);

export default libraryRoutes;
