import { Router } from "express";

import * as cartControllers from "../controllers/cartControllers";
import { authenticate, validate } from "../../middleware";
import { addItemSchema } from "../../validators";

// Carts are always scoped to the authenticated user (req.user.sub).
const cartRoutes = Router();

cartRoutes.get("/", authenticate, cartControllers.getCart);
cartRoutes.post("/items", authenticate, validate(addItemSchema), cartControllers.addItem);
cartRoutes.delete("/items/:gameId", authenticate, cartControllers.removeItem);
cartRoutes.delete("/", authenticate, cartControllers.clearCart);

export default cartRoutes;
