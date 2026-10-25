import { Router } from "express";

import * as playSessionControllers from "../controllers/playSessionControllers";
import { authenticate, validate } from "../../middleware";
import { startSessionSchema } from "../../validators";

// Play sessions feed refund eligibility ("hours played") and review playtime
// snapshots. Starting one requires a licence (checked in the service); stopping
// reports whole minutes played — integers, never floats.
const playSessionRoutes = Router();

playSessionRoutes.post("/", authenticate, validate(startSessionSchema), playSessionControllers.startSession);
playSessionRoutes.post("/:id/stop", authenticate, playSessionControllers.stopSession);
playSessionRoutes.get("/playtime/:gameId", authenticate, playSessionControllers.getPlaytime);

export default playSessionRoutes;
