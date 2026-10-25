import { Router } from "express";

import * as miscControllers from "../controllers/miscControllers";

// Liveness + real DB ping. Public and unauthenticated — uptime probes and the
// frontend status pill hit it before anything else.
const healthRoutes = Router();

healthRoutes.get("/", miscControllers.health);

export default healthRoutes;
