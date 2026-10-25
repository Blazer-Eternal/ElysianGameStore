import { Router } from "express";

import * as userControllers from "../controllers/userControllers";
import { authenticate, sensitiveLimiter, validate } from "../../middleware";
import { changePasswordSchema, updateProfileSchema } from "../../validators";

// Self-service profile surface. Admin user management (list / role & status
// changes) lives under /api/admin/users (see adminRoutes).
const userRoutes = Router();

userRoutes.get("/", authenticate, userControllers.getProfile);
userRoutes.patch("/", authenticate, validate(updateProfileSchema), userControllers.updateProfile);

// Password changes are credential changes: strict limiter on top of auth.
userRoutes.patch(
    "/password",
    authenticate,
    sensitiveLimiter,
    validate(changePasswordSchema),
    userControllers.changePassword,
);

export default userRoutes;
