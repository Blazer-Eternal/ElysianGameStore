import { Router } from "express";

import * as wishlistControllers from "../controllers/wishlistControllers";
import { authenticate, validate } from "../../middleware";
import { listWishlistQuerySchema, wishlistItemSchema } from "../../validators";

// Wishlist rows belong to the authenticated user and feed the promotion
// fan-out (wishlist → sale notifications) run by maintenanceServices.
const wishlistRoutes = Router();

wishlistRoutes.get("/", authenticate, validate(listWishlistQuerySchema, "query"), wishlistControllers.list);
wishlistRoutes.post("/", authenticate, validate(wishlistItemSchema), wishlistControllers.add);
wishlistRoutes.delete("/:gameId", authenticate, wishlistControllers.remove);

export default wishlistRoutes;
