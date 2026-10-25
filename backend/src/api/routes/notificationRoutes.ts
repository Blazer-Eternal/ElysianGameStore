import { Router } from "express";

import * as notificationControllers from "../controllers/notificationControllers";
import { authenticate, validate } from "../../middleware";
import { listNotificationsQuerySchema } from "../../validators";

// In-app notifications, always scoped to req.user.sub. Literal paths are
// declared before the "/:id/read" parameterised one for clarity.
const notificationRoutes = Router();

notificationRoutes.get(
    "/",
    authenticate,
    validate(listNotificationsQuerySchema, "query"),
    notificationControllers.listNotifications,
);
notificationRoutes.get("/unread-count", authenticate, notificationControllers.unreadCount);
notificationRoutes.patch("/read-all", authenticate, notificationControllers.markAllRead);
notificationRoutes.patch("/:id/read", authenticate, notificationControllers.markRead);

export default notificationRoutes;
