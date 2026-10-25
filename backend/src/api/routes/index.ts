import { Router } from "express";

import healthRoutes from "./healthRoutes";
import authRoutes from "./authRoutes";
import userRoutes from "./userRoutes";
import cartRoutes from "./cartRoutes";
import orderRoutes from "./orderRoutes";
import webhookRoutes from "./webhookRoutes";
import paymentRoutes from "./paymentRoutes";
import libraryRoutes from "./libraryRoutes";
import reviewRoutes from "./reviewRoutes";
import wishlistRoutes from "./wishlistRoutes";
import refundRoutes from "./refundRoutes";
import giftRoutes from "./giftRoutes";
import promotionRoutes from "./promotionRoutes";
import couponRoutes from "./couponRoutes";
import publisherRoutes from "./publisherRoutes";
import playSessionRoutes from "./playSessionRoutes";
import notificationRoutes from "./notificationRoutes";
import dashboardRoutes from "./dashboardRoutes";
import gameRoutes from "./gameRoutes";
import adminRoutes from "./adminRoutes";
import keyRoutes from "./keyRoutes";

// Everything is mounted under /api by app.ts. JSON body parsing (with the raw
// body capture used for webhook HMAC verification) lives in app.ts, so this hub
// only wires paths.
const router = Router();

router.use("/health", healthRoutes);
router.use("/auth", authRoutes);
router.use("/user", userRoutes);
router.use("/cart", cartRoutes);
router.use("/orders", orderRoutes);
router.use("/webhooks", webhookRoutes);
router.use("/payments", paymentRoutes);
router.use("/library", libraryRoutes);
router.use("/reviews", reviewRoutes);
router.use("/wishlist", wishlistRoutes);
router.use("/refunds", refundRoutes);
router.use("/gifts", giftRoutes);
router.use("/promotions", promotionRoutes);
router.use("/coupons", couponRoutes);
router.use("/publisher", publisherRoutes);
router.use("/play-sessions", playSessionRoutes);
router.use("/notifications", notificationRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/admin", adminRoutes);

// Games first: it owns the /games prefix. The keys domain also speaks in
// /games/:id/keys paths, so it is mounted at "/" and reached when the games
// router has no matching route (its keys paths are all literal-suffixed and
// never match inside gameRoutes).
router.use("/games", gameRoutes);
router.use("/", keyRoutes);

export default router;
