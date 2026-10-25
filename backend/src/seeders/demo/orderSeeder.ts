import { Database } from "../../config";
import { LibrarySource } from "../../enums/librarySourceEnum";
import { OrderStatus } from "../../enums/orderStatusEnum";
import { PaymentProvider } from "../../enums/paymentProviderEnum";
import { PaymentStatus } from "../../enums/paymentStatusEnum";
import { PayoutCurrency } from "../../enums/payoutCurrencyEnum";
import { PayoutStatus } from "../../enums/payoutStatusEnum";
import { RefundStatus } from "../../enums/refundStatusEnum";
// Importing from the models index runs initModel + defineAssociations once.
import {
    Cart,
    CartItem,
    Coupon,
    Game,
    LibraryEntry,
    Order,
    OrderItem,
    Payment,
    Payout,
    PlaySession,
    Publisher,
    Refund,
    User,
} from "../../models";
import { IOrderCreation } from "../../interfaces/orderInterface";
import { IOrderItemCreation } from "../../interfaces/orderItemInterface";
import { IPaymentCreation } from "../../interfaces/paymentInterface";
import { IPlaySessionCreation } from "../../interfaces/playSessionInterface";
import { computeQuote } from "../../services/pricingServices";
import { insertedCount, seedUuid } from "../seedUtils";
import { emailOf } from "./userSeeder";

const { sequelize } = Database;

// ---------------------------------------------------------------------------
// Commerce demo data. Orders are priced through the real pricing engine
// (computeQuote) so every snapshot matches what checkout would produce —
// promotions, coupon splits and the VAT largest-remainder allocation all come
// out of production code, and the DB CHECKs (orders_total_formula,
// order_items_discount_split) are satisfied by construction.
//
// Lifecycle coverage: PAID (several), PENDING, FAILED, REFUNDED (fully) and
// PARTIAL_REFUND (one of two items). PAID items spawn library entries and
// play sessions; refunded items keep a revoked entry (the legal trail).
//
// Idempotency: orders/items/payments/sessions use deterministic UUIDs
// (seedUuid), refunds key on the unique order_item_id, library entries on
// (user_id, game_id), carts on the unique user_id.
// ---------------------------------------------------------------------------

const DAY_MS = 86400000;
const MINUTE_MS = 60000;

interface SeedOrder {
    key: string;
    user: string; // demo user key
    games: string[]; // game slugs
    coupon: string | null;
    provider: PaymentProvider;
    status: OrderStatus;
    daysAgo: number;
    /** For PARTIAL_REFUND: which of the order's games were refunded. */
    refundGames?: string[];
    refundDaysAgo?: number;
}

export const SEED_ORDERS: SeedOrder[] = [
    { key: "aarav-1", user: "aarav", games: ["snow-leopard-chronicles", "kathmandu-drifter"], coupon: null, provider: PaymentProvider.ESEWA, status: OrderStatus.PAID, daysAgo: 12 },
    { key: "aarav-2", user: "aarav", games: ["cyber-yeti"], coupon: "DASHAIN500", provider: PaymentProvider.KHALTI, status: OrderStatus.PAID, daysAgo: 6 },
    { key: "nisha-1", user: "nisha", games: ["neon-bazaar", "yeti-siege", "prayer-flags"], coupon: "WELCOME10", provider: PaymentProvider.CONNECTIPS, status: OrderStatus.PAID, daysAgo: 9 },
    { key: "nisha-2", user: "nisha", games: ["snow-leopard-chronicles", "ghost-street-kathmandu"], coupon: null, provider: PaymentProvider.IMEPAY, status: OrderStatus.PAID, daysAgo: 4 },
    { key: "kiran-1", user: "kiran", games: ["terminus-null"], coupon: null, provider: PaymentProvider.ESEWA, status: OrderStatus.PAID, daysAgo: 7 },
    { key: "kiran-2", user: "kiran", games: ["himalayan-heights"], coupon: null, provider: PaymentProvider.ESEWA, status: OrderStatus.PENDING, daysAgo: 1 },
    { key: "kiran-3", user: "kiran", games: ["sherpa-ascending"], coupon: null, provider: PaymentProvider.KHALTI, status: OrderStatus.FAILED, daysAgo: 2 },
    { key: "nisha-3", user: "nisha", games: ["cyber-yeti"], coupon: null, provider: PaymentProvider.IMEPAY, status: OrderStatus.REFUNDED, daysAgo: 14, refundDaysAgo: 10 },
    { key: "aarav-3", user: "aarav", games: ["monsoon-mayhem", "rickshaw-rumble"], coupon: null, provider: PaymentProvider.CONNECTIPS, status: OrderStatus.PARTIAL_REFUND, daysAgo: 8, refundGames: ["rickshaw-rumble"], refundDaysAgo: 5 },
];

// Carts: a couple of not-yet-owned games per customer.
const SEED_CARTS: Record<string, string[]> = {
    aarav: ["terminus-null", "everest-base-camp-tycoon"],
    nisha: ["summit-siege-legends", "midnight-mandala"],
    kiran: ["neon-bazaar", "dharma-defenders", "cloud-kingdoms"],
};

// Wishlists (fixed added_at so the rows are stable).
const SEED_WISHLISTS: Record<string, string[]> = {
    aarav: ["raktaksha-protocol", "cloud-kingdoms", "project-sagarmatha"],
    nisha: ["snow-leopard-chronicles", "yeti-siege", "summit-siege-legends"],
    kiran: ["terminus-null", "cyber-yeti", "ghost-street-kathmandu"],
};

// What the order loop needs from a quote — either freshly computed by the
// pricing engine or replayed from an already-seeded order's stored snapshot.
interface QuoteView {
    items: Array<{
        gameId: string;
        slug: string;
        publisherId: string;
        revenueSharePct: number;
        basePricePaisa: number;
        promotionDiscountPaisa: number;
        couponDiscountPaisa: number;
        taxPaisa: number;
    }>;
    subtotalPaisa: number;
    discountPaisa: number;
    taxPaisa: number;
    totalPaisa: number;
    couponId: string | null;
}

const paymentStatusFor = (status: OrderStatus): PaymentStatus => {
    switch (status) {
        case OrderStatus.PAID:
        case OrderStatus.PARTIAL_REFUND:
            return PaymentStatus.PAID;
        case OrderStatus.REFUNDED:
            return PaymentStatus.REFUNDED;
        case OrderStatus.FAILED:
            return PaymentStatus.FAILED;
        default:
            return PaymentStatus.INITIATED;
    }
};

export const runOrderSeeder = async (): Promise<{ created: Record<string, number> }> => {
    const users = await User.findAll({ attributes: ["id", "email"] });
    const userIdByKey = new Map(users.map((u) => [u.email.split("@")[0], u.id]));
    const admin = users.find((u) => u.email === "demo.admin@example.com");

    const games = await Game.findAll();
    const gameBySlug = new Map(games.map((g) => [g.slug, g]));
    const gameIdToSlug = new Map(games.map((g) => [g.id, g.slug]));

    let cartsCreated = 0;
    let cartItemsCreated = 0;
    let wishlistsCreated = 0;
    let ordersCreated = 0;
    let orderItemsCreated = 0;
    let paymentsCreated = 0;
    let libraryCreated = 0;
    let sessionsCreated = 0;
    let refundsCreated = 0;
    let payoutsCreated = 0;

    // ---- carts + cart items ----
    for (const [userKey, slugs] of Object.entries(SEED_CARTS)) {
        const userId = userIdByKey.get(userKey);
        if (!userId) throw new Error(`Cart owner missing: ${userKey} — run userSeeder first`);

        const [cart, cartCreated] = await Cart.findOrCreate({ where: { userId }, defaults: { userId } });
        if (cartCreated) cartsCreated += 1;

        for (const slug of slugs) {
            const game = gameBySlug.get(slug);
            if (!game) throw new Error(`Cart game missing: ${slug} — run gameSeeder first`);
            const [, itemCreated] = await CartItem.findOrCreate({
                where: { cartId: cart.id, gameId: game.id },
                defaults: { cartId: cart.id, gameId: game.id, addedAt: new Date("2026-10-15T10:00:00.000Z") },
            });
            if (itemCreated) cartItemsCreated += 1;
        }
    }

    // ---- wishlists (composite PK, no id column → raw ON CONFLICT insert) ----
    for (const [userKey, slugs] of Object.entries(SEED_WISHLISTS)) {
        const userId = userIdByKey.get(userKey);
        if (!userId) throw new Error(`Wishlist owner missing: ${userKey} — run userSeeder first`);
        for (const slug of slugs) {
            const game = gameBySlug.get(slug);
            if (!game) throw new Error(`Wishlist game missing: ${slug} — run gameSeeder first`);
            const [, meta] = await sequelize.query(
                `INSERT INTO wishlists (user_id, game_id, added_at) VALUES (:userId, :gameId, :addedAt)
                 ON CONFLICT (user_id, game_id) DO NOTHING`,
                {
                    replacements: {
                        userId,
                        gameId: game.id,
                        addedAt: new Date("2026-10-10T09:00:00.000Z"),
                    },
                },
            );
            if (insertedCount(meta) > 0) wishlistsCreated += 1;
        }
    }

    // ---- orders (priced by the real engine) + items, payments, refunds,
    //      library entries, play sessions ----
    for (const seed of SEED_ORDERS) {
        const userId = userIdByKey.get(seed.user);
        if (!userId) throw new Error(`Order buyer missing: ${seed.user} — run userSeeder first`);

        const gameIds = seed.games.map((slug) => {
            const game = gameBySlug.get(slug);
            if (!game) throw new Error(`Order game missing: ${slug} — run gameSeeder first`);
            return game.id;
        });

        const orderId = seedUuid(`order:${seed.key}`);

        // Price with the real engine ONLY when the order does not exist yet.
        // On re-runs the coupon's per-user limit would (correctly) reject the
        // buyer who already used it, so existing orders replay their stored
        // snapshot instead of re-validating anything.
        const existingOrder = await Order.findOne({ where: { id: orderId } });
        let quote: QuoteView;
        if (existingOrder) {
            const storedItems = await OrderItem.findAll({ where: { orderId: existingOrder.id } });
            if (storedItems.length > 0) {
                quote = {
                    items: storedItems.map((row) => ({
                        gameId: row.gameId,
                        slug: gameIdToSlug.get(row.gameId) ?? row.gameId,
                        publisherId: row.publisherId,
                        revenueSharePct: row.revenueSharePct,
                        basePricePaisa: row.unitPricePaisa,
                        promotionDiscountPaisa: row.promotionDiscountPaisa,
                        couponDiscountPaisa: row.couponDiscountPaisa,
                        taxPaisa: row.taxPaisa,
                    })),
                    subtotalPaisa: existingOrder.subtotalPaisa,
                    discountPaisa: existingOrder.discountPaisa,
                    taxPaisa: existingOrder.taxPaisa,
                    totalPaisa: existingOrder.totalPaisa,
                    couponId: existingOrder.couponId,
                };
            } else {
                // Interrupted first run left an order shell without items —
                // re-price without the coupon to avoid tripping its limits.
                quote = await computeQuote({ gameIds, userId });
            }
        } else {
            quote = await computeQuote({
                gameIds,
                couponCode: seed.coupon ?? undefined,
                userId,
            });
        }

        const paidAt =
            seed.status === OrderStatus.PENDING || seed.status === OrderStatus.FAILED
                ? null
                : new Date(Date.now() - seed.daysAgo * DAY_MS);

        const [order, orderCreated] = await Order.findOrCreate({
            where: { id: orderId },
            defaults: {
                id: orderId,
                userId,
                status: seed.status,
                subtotalPaisa: quote.subtotalPaisa,
                discountPaisa: quote.discountPaisa,
                taxPaisa: quote.taxPaisa,
                totalPaisa: quote.totalPaisa,
                currency: "NPR",
                couponId: quote.couponId,
                giftRecipientEmail: null,
                paidAt,
                createdAt: new Date(Date.now() - seed.daysAgo * DAY_MS),
            } as IOrderCreation,
        });
        if (orderCreated) ordersCreated += 1;

        // ---- order items: full price snapshot from the quote ----
        const itemIdBySlug = new Map<string, string>();
        for (const item of quote.items) {
            const itemId = seedUuid(`order-item:${seed.key}:${item.slug}`);
            itemIdBySlug.set(item.slug, itemId);
            const [, itemCreated] = await OrderItem.findOrCreate({
                where: { id: itemId },
                defaults: {
                    id: itemId,
                    orderId: order.id,
                    gameId: item.gameId,
                    unitPricePaisa: item.basePricePaisa,
                    promotionDiscountPaisa: item.promotionDiscountPaisa,
                    couponDiscountPaisa: item.couponDiscountPaisa,
                    discountPaisa: item.promotionDiscountPaisa + item.couponDiscountPaisa,
                    taxPaisa: item.taxPaisa,
                    publisherId: item.publisherId,
                    revenueSharePct: item.revenueSharePct,
                } as IOrderItemCreation,
            });
            if (itemCreated) orderItemsCreated += 1;
        }

        // ---- payment row (webhook-idempotent provider_txn_id) ----
        const paymentId = seedUuid(`payment:${seed.key}`);
        const paymentStatus = paymentStatusFor(seed.status);
        const [, paymentCreated] = await Payment.findOrCreate({
            where: { id: paymentId },
            defaults: {
                id: paymentId,
                orderId: order.id,
                provider: seed.provider,
                providerTxnId: `TX-SEED-${seed.key.toUpperCase()}`,
                idempotencyKey: `IDEM-SEED-${seed.key.toUpperCase()}`,
                status: paymentStatus,
                amountPaisa: quote.totalPaisa,
                rawResponse: {
                    seeded: true,
                    provider: seed.provider,
                    status: paymentStatus,
                    reference: `TX-SEED-${seed.key.toUpperCase()}`,
                },
            } as IPaymentCreation,
        });
        if (paymentCreated) paymentsCreated += 1;

        // ---- refunds (one per refunded item; unique order_item_id) ----
        const refundedSlugs =
            seed.status === OrderStatus.REFUNDED
                ? seed.games
                : seed.refundGames ?? [];

        for (const slug of refundedSlugs) {
            const item = quote.items.find((i) => i.slug === slug);
            if (!item) throw new Error(`Refund item missing: ${slug} in order ${seed.key}`);
            const itemId = itemIdBySlug.get(slug)!;
            const refundAt = new Date(Date.now() - (seed.refundDaysAgo ?? seed.daysAgo - 1) * DAY_MS);

            const [, refundCreated] = await Refund.findOrCreate({
                where: { orderItemId: itemId },
                defaults: {
                    orderItemId: itemId,
                    reason: "Seeded demo refund — performance on low-end hardware",
                    // exactly what the buyer paid for the line: net + its VAT slice
                    amountPaisa:
                        item.basePricePaisa - (item.promotionDiscountPaisa + item.couponDiscountPaisa) + item.taxPaisa,
                    status: RefundStatus.APPROVED,
                    requestedAt: refundAt,
                    decidedBy: admin?.id ?? null,
                    decidedAt: refundAt,
                },
            });
            if (refundCreated) refundsCreated += 1;
        }

        // ---- library entries + play sessions for paid items ----
        if (
            seed.status === OrderStatus.PAID ||
            seed.status === OrderStatus.PARTIAL_REFUND ||
            seed.status === OrderStatus.REFUNDED
        ) {
            for (const item of quote.items) {
                const isRefunded = refundedSlugs.includes(item.slug);
                const [, entryCreated] = await LibraryEntry.findOrCreate({
                    where: { userId, gameId: item.gameId },
                    defaults: {
                        userId,
                        gameId: item.gameId,
                        orderItemId: itemIdBySlug.get(item.slug) ?? null,
                        acquiredAt: paidAt ?? new Date(Date.now() - seed.daysAgo * DAY_MS),
                        source: LibrarySource.PURCHASE,
                        // refunded purchases keep the revoked trail, never a delete
                        revokedAt: isRefunded
                            ? new Date(Date.now() - (seed.refundDaysAgo ?? seed.daysAgo - 1) * DAY_MS)
                            : null,
                    },
                });
                if (entryCreated) libraryCreated += 1;

                // 2 short sessions per acquisition (refunded ones included —
                // the buyer played a bit before asking for the money back)
                for (let s = 0; s < 2; s += 1) {
                    const sessionId = seedUuid(`play-session:${seed.key}:${item.slug}:${s}`);
                    const startedAt = new Date(
                        (paidAt ?? new Date()).getTime() + (s + 1) * 5 * 60 * MINUTE_MS,
                    );
                    const [, sessionCreated] = await PlaySession.findOrCreate({
                        where: { id: sessionId },
                        defaults: {
                            id: sessionId,
                            userId,
                            gameId: item.gameId,
                            startedAt,
                            endedAt: new Date(startedAt.getTime() + (45 + s * 30) * MINUTE_MS),
                        } as IPlaySessionCreation,
                    });
                    if (sessionCreated) sessionsCreated += 1;
                }
            }
        }
    }

    // ---- coupon usage counters (atomic-check friendly) ----
    for (const code of ["WELCOME10", "DASHAIN500"]) {
        const coupon = await Coupon.findOne({ where: { code } });
        if (!coupon) continue;
        const used = await Order.count({ where: { couponId: coupon.id } });
        if (coupon.usedCount !== used) await coupon.update({ usedCount: used });
    }

    // ---- payouts: one settled (last month) + one on hold (this month) ----
    const publishers = await Publisher.findAll();
    for (const publisher of publishers) {
        const [grossRow] = (await sequelize.query(
            `SELECT COALESCE(SUM(oi.unit_price_paisa - oi.promotion_discount_paisa - oi.coupon_discount_paisa), 0)::bigint AS gross
             FROM order_items oi
             JOIN orders o ON o.id = oi.order_id
             WHERE oi.publisher_id = :pid
               AND o.status IN ('PAID', 'PARTIAL_REFUND', 'REFUNDED')`,
            { replacements: { pid: publisher.id }, type: "SELECT" as never },
        )) as unknown as Array<{ gross: string }>;

        const [refundRow] = (await sequelize.query(
            `SELECT COALESCE(SUM(oi.unit_price_paisa - oi.discount_paisa + oi.tax_paisa), 0)::bigint AS refunds
             FROM order_items oi
             JOIN refunds r ON r.order_item_id = oi.id AND r.status = 'APPROVED'
             WHERE oi.publisher_id = :pid`,
            { replacements: { pid: publisher.id }, type: "SELECT" as never },
        )) as unknown as Array<{ refunds: string }>;

        const gross = Number(grossRow.gross);
        const refunds = Number(refundRow.refunds);
        const share = publisher.revenueSharePct;
        const commission = Math.floor(((gross - refunds) * (100 - share)) / 100);
        const net = gross - refunds - commission;
        if (gross === 0) continue; // nothing to pay out yet

        const periods = [
            {
                key: `${publisher.id}:2026-09`,
                start: new Date("2026-09-01T00:00:00.000Z"),
                end: new Date("2026-09-30T23:59:59.999Z"),
                status: PayoutStatus.PAID,
                scale: 1 / 3,
            },
            {
                key: `${publisher.id}:2026-10`,
                start: new Date("2026-10-01T00:00:00.000Z"),
                end: new Date("2026-10-31T23:59:59.999Z"),
                status: PayoutStatus.PENDING,
                scale: 1,
            },
        ];

        for (const period of periods) {
            const pGross = Math.floor(gross * period.scale);
            const pRefunds = Math.floor(refunds * period.scale);
            const pCommission = Math.floor(((pGross - pRefunds) * (100 - share)) / 100);
            const pNet = pGross - pRefunds - pCommission;
            if (pGross === 0) continue;

            const [, payoutCreated] = await Payout.findOrCreate({
                where: {
                    publisherId: publisher.id,
                    periodStart: period.start,
                    periodEnd: period.end,
                },
                defaults: {
                    publisherId: publisher.id,
                    periodStart: period.start,
                    periodEnd: period.end,
                    grossPaisa: pGross,
                    refundsPaisa: pRefunds,
                    commissionPaisa: pCommission,
                    netPaisa: pNet,
                    payoutCurrency:
                        publisher.payoutCurrency === PayoutCurrency.USD
                            ? PayoutCurrency.USD
                            : PayoutCurrency.NPR,
                    fxRateSnapshot:
                        publisher.payoutCurrency === PayoutCurrency.USD ? 133.5 : null,
                    status: period.status,
                },
            });
            if (payoutCreated) payoutsCreated += 1;
        }
    }

    return {
        created: {
            carts: cartsCreated,
            cartItems: cartItemsCreated,
            wishlists: wishlistsCreated,
            orders: ordersCreated,
            orderItems: orderItemsCreated,
            payments: paymentsCreated,
            refunds: refundsCreated,
            libraryEntries: libraryCreated,
            playSessions: sessionsCreated,
            payouts: payoutsCreated,
        },
    };
};

if (require.main === module) {
    runOrderSeeder()
        .then(({ created }) => console.log("Orders seeded:", created))
        .catch((error) => {
            console.error("Order seeding failed:", error);
            process.exitCode = 1;
        });
}
