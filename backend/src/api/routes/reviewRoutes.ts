import { Router } from "express";

import * as reviewControllers from "../controllers/reviewControllers";
import { authenticate, validate } from "../../middleware";
import { createReviewSchema, listReviewsQuerySchema, updateReviewSchema } from "../../validators";

// Reading reviews is public; writing one requires an account (ownership of the
// review itself is asserted in the service).
const reviewRoutes = Router();

reviewRoutes.get("/", validate(listReviewsQuerySchema, "query"), reviewControllers.listByGame);
reviewRoutes.post("/", authenticate, validate(createReviewSchema), reviewControllers.createReview);
reviewRoutes.patch("/:id", authenticate, validate(updateReviewSchema), reviewControllers.updateReview);
reviewRoutes.delete("/:id", authenticate, reviewControllers.deleteReview);
reviewRoutes.post("/:id/helpful", authenticate, reviewControllers.markHelpful);

export default reviewRoutes;
