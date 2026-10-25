import { NotificationType } from "../../enums/notificationTypeEnum";
// Importing from the models index runs initModel + defineAssociations once.
import { Notification, Order, User } from "../../models";
import { INotificationCreation } from "../../interfaces/notificationInterface";
import { seedUuid } from "../seedUtils";
import { SEED_ORDERS } from "./orderSeeder";

// ---------------------------------------------------------------------------
// In-app notifications covering every fan-out path the app implements:
//   * SYSTEM  — welcome message per demo account
//   * ORDER   — payment confirmation per paid order
//   * REFUND  — refund approved (full + partial)
//   * PROMOTION — wishlist sale alert, one already converted (stamped
//     converted_at after the buyer purchased the promoted game) and one still
//     unread, mirroring the promotion fan-out + conversion analytics loop.
//
// Idempotent via deterministic ids; ORDER/REFUND payloads are read back from
// the actual seeded orders so the JSONB data matches the rows.
// ---------------------------------------------------------------------------

export const runNotificationSeeder = async (): Promise<{ created: Record<string, number> }> => {
    const users = await User.findAll({ attributes: ["id", "email"] });
    const userIdByKey = new Map(users.map((u) => [u.email.split("@")[0], u.id]));

    let created = 0;

    const insert = async (params: {
        id: string;
        userId: string;
        type: NotificationType;
        title: string;
        body: string;
        data?: unknown;
        readAt?: Date | null;
        convertedAt?: Date | null;
    }): Promise<void> => {
        const [, wasCreated] = await Notification.findOrCreate({
            where: { id: params.id },
            defaults: {
                id: params.id,
                userId: params.userId,
                type: params.type,
                title: params.title,
                body: params.body,
                data: params.data ?? null,
                readAt: params.readAt ?? null,
                convertedAt: params.convertedAt ?? null,
            } as INotificationCreation,
        });
        if (wasCreated) created += 1;
    };

    // ---- welcome SYSTEM messages ----
    for (const [key, userId] of userIdByKey) {
        await insert({
            id: seedUuid(`notification:welcome:${key}`),
            userId,
            type: NotificationType.SYSTEM,
            title: "Welcome to Elysian!",
            body: "Your account is ready. Verify your email preferences and start browsing the catalogue.",
            readAt: new Date("2026-10-01T08:00:00.000Z"),
        });
    }

    // ---- ORDER confirmations for every paid-ish seeded order ----
    for (const seed of SEED_ORDERS) {
        if (!["PAID", "PARTIAL_REFUND", "REFUNDED"].includes(seed.status)) continue;
        const userId = userIdByKey.get(seed.user);
        if (!userId) continue;

        const order = await Order.findOne({ where: { id: seedUuid(`order:${seed.key}`) } });
        if (!order) continue;

        await insert({
            id: seedUuid(`notification:order:${seed.key}`),
            userId,
            type: NotificationType.ORDER,
            title: "Payment received",
            body: `Order ${seed.key} is confirmed — ${seed.games.length} game(s) added to your library.`,
            data: { orderRef: seed.key, totalPaisa: order.totalPaisa, currency: order.currency },
            readAt: order.paidAt,
        });
    }

    // ---- REFUND approvals ----
    const refundNotifs: Array<{ key: string; user: string; text: string }> = [
        { key: "nisha-3", user: "nisha", text: "Your refund for Cyber Yeti was approved and processed." },
        { key: "aarav-3", user: "aarav", text: "Your partial refund for Rickshaw Rumble was approved and processed." },
    ];
    for (const notif of refundNotifs) {
        const userId = userIdByKey.get(notif.user);
        if (!userId) continue;
        const order = await Order.findOne({ where: { id: seedUuid(`order:${notif.key}`) } });
        if (!order) continue;
        await insert({
            id: seedUuid(`notification:refund:${notif.key}`),
            userId,
            type: NotificationType.REFUND,
            title: "Refund approved",
            body: notif.text,
            data: { orderRef: notif.key },
            readAt: new Date(),
        });
    }

    // ---- PROMOTION fan-out to wishlisters (one converted, one unread) ----
    const nishaId = userIdByKey.get("nisha");
    const nishaSnowOrder = await Order.findOne({ where: { id: seedUuid("order:nisha-2") } });
    if (nishaId && nishaSnowOrder) {
        await insert({
            id: seedUuid("notification:promotion:nisha-snow-leopard"),
            userId: nishaId,
            type: NotificationType.PROMOTION,
            title: "Snow Leopard Chronicles is 25% off",
            body: "A game on your wishlist is on sale during the Monsoon Mega Sale.",
            data: { gameSlug: "snow-leopard-chronicles", promotion: "Monsoon Mega Sale" },
            readAt: new Date(Date.now() - 2 * 86400000),
            // bought the promoted game afterwards → conversion stamped
            convertedAt: nishaSnowOrder.paidAt,
        });
    }
    const kiranId = userIdByKey.get("kiran");
    if (kiranId) {
        await insert({
            id: seedUuid("notification:promotion:kiran-cyber-yeti"),
            userId: kiranId,
            type: NotificationType.PROMOTION,
            title: "Cyber Yeti is 25% off",
            body: "A game on your wishlist is on sale during the Monsoon Mega Sale.",
            data: { gameSlug: "cyber-yeti", promotion: "Monsoon Mega Sale" },
        });
    }

    return { created: { notifications: created } };
};

if (require.main === module) {
    runNotificationSeeder()
        .then(({ created }) => console.log(`Notifications: +${created.notifications}`))
        .catch((error) => {
            console.error("Notification seeding failed:", error);
            process.exitCode = 1;
        });
}
