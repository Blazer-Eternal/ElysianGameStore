import { DiscountType } from "../../enums/discountTypeEnum";
import { FundedBy } from "../../enums/fundedByEnum";
import { PromotionType } from "../../enums/promotionTypeEnum";
import { IPromotionCreation } from "../../interfaces/promotionInterface";
// Importing from the models index runs initModel + defineAssociations once.
import { Coupon, Game, Promotion, PromotionGame, User } from "../../models";
import { toPaisa } from "../../utils/money";
import { seedUuid } from "../seedUtils";

// ---------------------------------------------------------------------------
// Promotions + coupons. All money is integer paisa; percent values are whole
// percent points. Promotion windows are anchored to "now" so at least one
// promotion is always live in demo environments, one is scheduled for the
// future (notification fan-out demo) and one has already ended (history).
//
// Per-game promotion coverage never overlaps: promotionServices refuses
// intersecting windows per game, and the seed honours that invariant.
//
// Idempotency: promotions by deterministic id, promotion_games by their unique
// (promotion_id, game_id) pair, coupons by unique code.
// ---------------------------------------------------------------------------

const DAY_MS = 86400000;

interface DemoPromotion {
    name: string;
    type: PromotionType;
    value: number; // percent points, or paisa for FIXED/BUNDLE
    startsDaysAgo: number;
    endsDaysAhead: number;
    fundedBy: FundedBy;
    createdByEmail: string;
    games: Array<{ slug: string; discountPct: number }>;
}

export const DEMO_PROMOTIONS: DemoPromotion[] = [
    {
        name: "Monsoon Mega Sale",
        type: PromotionType.PERCENT,
        value: 25,
        startsDaysAgo: 3,
        endsDaysAhead: 11,
        fundedBy: FundedBy.STORE,
        createdByEmail: "demo.admin@example.com",
        games: [
            { slug: "snow-leopard-chronicles", discountPct: 25 },
            { slug: "yeti-siege", discountPct: 25 },
            { slug: "neon-bazaar", discountPct: 25 },
            { slug: "cyber-yeti", discountPct: 25 },
            { slug: "prayer-flags", discountPct: 25 },
        ],
    },
    {
        name: "Himalaya Studio Spotlight",
        type: PromotionType.PERCENT,
        value: 15,
        startsDaysAgo: 1,
        endsDaysAhead: 6,
        fundedBy: FundedBy.PUBLISHER,
        createdByEmail: "himalaya.studio@example.com",
        games: [
            { slug: "kathmandu-drifter", discountPct: 15 },
            { slug: "monsoon-mayhem", discountPct: 15 },
            { slug: "rickshaw-rumble", discountPct: 15 },
            { slug: "everest-base-camp-tycoon", discountPct: 15 },
        ],
    },
    {
        name: "Nepal Game Fest Bundle",
        type: PromotionType.BUNDLE,
        value: toPaisa(800), // Rs 800 off when the whole set is in the cart
        startsDaysAgo: 5,
        endsDaysAhead: 25,
        fundedBy: FundedBy.STORE,
        createdByEmail: "demo.admin@example.com",
        games: [
            { slug: "himalayan-heights", discountPct: 40 },
            { slug: "dharma-defenders", discountPct: 40 },
            { slug: "midnight-mandala", discountPct: 40 },
        ],
    },
    {
        name: "Dashain Dhamaka",
        type: PromotionType.PERCENT,
        value: 40,
        startsDaysAgo: 10,
        endsDaysAhead: -4, // already ended — historical reporting demo
        fundedBy: FundedBy.STORE,
        createdByEmail: "demo.admin@example.com",
        games: [
            { slug: "sherpa-ascending", discountPct: 40 },
            { slug: "cloud-kingdoms", discountPct: 40 },
        ],
    },
    {
        name: "Year-End spectacular",
        type: PromotionType.PERCENT,
        value: 30,
        startsDaysAgo: -14, // scheduled — wishlist fan-out fires when it starts
        endsDaysAhead: 21,
        fundedBy: FundedBy.STORE,
        createdByEmail: "demo.admin@example.com",
        games: [
            { slug: "terminus-null", discountPct: 30 },
            { slug: "summit-siege-legends", discountPct: 30 },
            { slug: "raktaksha-protocol", discountPct: 30 },
            { slug: "ghost-street-kathmandu", discountPct: 30 },
        ],
    },
];

interface DemoCoupon {
    code: string;
    discountType: DiscountType;
    value: number; // percent points, or paisa for FIXED
    maxUses: number;
    perUserLimit: number | null;
    minOrderRs: number;
    expiresDaysAhead: number | null;
    isActive: boolean;
}

const COUPONS: DemoCoupon[] = [
    { code: "WELCOME10", discountType: DiscountType.PERCENT, value: 10, maxUses: 1000, perUserLimit: 1, minOrderRs: 0, expiresDaysAhead: 365, isActive: true },
    { code: "DASHAIN500", discountType: DiscountType.FIXED, value: toPaisa(500), maxUses: 500, perUserLimit: 2, minOrderRs: 1000, expiresDaysAhead: 90, isActive: true },
    { code: "EXPIRED10", discountType: DiscountType.PERCENT, value: 10, maxUses: 100, perUserLimit: null, minOrderRs: 0, expiresDaysAhead: -10, isActive: false },
];

export const runPromotionSeeder = async (): Promise<{ created: Record<string, number> }> => {
    const now = Date.now();

    let promotionsCreated = 0;
    let promotionGamesCreated = 0;
    let couponsCreated = 0;

    for (const demo of DEMO_PROMOTIONS) {
        const createdBy = await User.findOne({ where: { email: demo.createdByEmail } });
        if (!createdBy) throw new Error(`Promotion creator missing: ${demo.createdByEmail}`);

        const startsAt = new Date(now - demo.startsDaysAgo * DAY_MS);
        const endsAt = new Date(now + demo.endsDaysAhead * DAY_MS);
        const id = seedUuid(`promotion:${demo.name}`);

        const [promotion, promoCreated] = await Promotion.findOrCreate({
            where: { id },
            defaults: {
                id,
                name: demo.name,
                type: demo.type,
                value: demo.value,
                startsAt,
                endsAt,
                fundedBy: demo.fundedBy,
                createdBy: createdBy.id,
                // Already-started promotions are stamped as fanned out so the
                // notification sweep never re-notifies seeded wishlisters.
                notifiedAt: demo.startsDaysAgo >= 0 ? startsAt : null,
            } as IPromotionCreation,
        });
        if (promoCreated) promotionsCreated += 1;

        for (const entry of demo.games) {
            const game = await Game.findOne({ where: { slug: entry.slug } });
            if (!game) throw new Error(`Promotion game missing: ${entry.slug} — run gameSeeder first`);

            const [, pgCreated] = await PromotionGame.findOrCreate({
                where: { promotionId: promotion.id, gameId: game.id },
                defaults: {
                    promotionId: promotion.id,
                    gameId: game.id,
                    discountPct: entry.discountPct,
                },
            });
            if (pgCreated) promotionGamesCreated += 1;
        }
    }

    for (const demo of COUPONS) {
        const [, couponCreated] = await Coupon.findOrCreate({
            where: { code: demo.code },
            defaults: {
                code: demo.code,
                discountType: demo.discountType,
                value: demo.value,
                maxUses: demo.maxUses,
                usedCount: 0,
                perUserLimit: demo.perUserLimit,
                minOrderPaisa: toPaisa(demo.minOrderRs),
                expiresAt: demo.expiresDaysAhead === null ? null : new Date(now + demo.expiresDaysAhead * DAY_MS),
                isActive: demo.isActive,
            },
        });
        if (couponCreated) couponsCreated += 1;
    }

    return { created: { promotions: promotionsCreated, promotionGames: promotionGamesCreated, coupons: couponsCreated } };
};

if (require.main === module) {
    runPromotionSeeder()
        .then(({ created }) => console.log("Promotions seeded:", created))
        .catch((error) => {
            console.error("Promotion seeding failed:", error);
            process.exitCode = 1;
        });
}
