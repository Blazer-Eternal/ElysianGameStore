import { AgeRating, AGE_REQUIREMENTS, ageFromBirthDate } from "../enums/ageRatingEnum";
import { DiscountType } from "../enums/discountTypeEnum";
import { GameStatus } from "../enums/gameStatusEnum";
import { PromotionType } from "../enums/promotionTypeEnum";
import Coupon from "../models/couponModel";
import Game from "../models/gameModel";
import TaxConfig from "../models/taxConfigModel";
import {
    CouponRepository,
    GameRepository,
    PromotionGameRepository,
    TaxConfigRepository,
} from "../repositories";
import AppError from "../utils/appError";
import { allocateProportional, bpsAmount, percentOff } from "../utils/money";
import { audit, AUDIT_ACTIONS } from "./auditServices";

// ---------------------------------------------------------------------------
// The server-side price engine. Client totals are never trusted: every figure
// below is recomputed here at checkout and snapshotted into OrderItem rows.
//
//   price     = base_price_paisa
//   price    -= best active promotion discount
//   price    -= coupon discount (never below 0)
//   tax       = round(price × rate_bps / 10000)      ← rounded exactly once
//   total     = price + tax
//
// Percent discounts floor per item; everything that must sum back exactly
// (coupon split, fixed promotions, tax split) uses largest-remainder
// allocation so no paisa is created or destroyed.
// ---------------------------------------------------------------------------

export interface QuoteItem {
    gameId: string;
    title: string;
    slug: string;
    ageRating: AgeRating;
    publisherId: string;
    revenueSharePct: number;
    basePricePaisa: number;
    promotionId: string | null;
    promotionDiscountPaisa: number;
    priceAfterPromoPaisa: number;
    couponDiscountPaisa: number;
    netPaisa: number;
    taxPaisa: number;
}

export interface PriceQuote {
    items: QuoteItem[];
    subtotalPaisa: number;
    promoDiscountPaisa: number;
    couponDiscountPaisa: number;
    discountPaisa: number;
    netPaisa: number;
    taxPaisa: number;
    totalPaisa: number;
    taxRateBps: number;
    couponId: string | null;
}

// VAT from the database — the row with the latest effective_from wins. No
// hard-coded rate exists anywhere in this codebase.
export const getEffectiveTaxConfig = async (): Promise<TaxConfig | null> => {
    const config = await TaxConfigRepository.findLatest();
    if (!config) {
        console.warn("No tax_config row found — quoting without VAT. Seed TaxConfig!");
    }
    return config;
};

const validateCoupon = async (
    coupon: Coupon,
    ctx: { userId?: string; netAfterPromoPaisa: number },
): Promise<void> => {
    if (!coupon.isActive) throw AppError.badRequest("This coupon is no longer active");
    if (coupon.expiresAt && coupon.expiresAt.getTime() < Date.now()) {
        throw AppError.badRequest("This coupon has expired");
    }
    if (coupon.usedCount >= coupon.maxUses) {
        throw AppError.badRequest("This coupon has reached its usage limit");
    }
    if (ctx.netAfterPromoPaisa < coupon.minOrderPaisa) {
        throw AppError.badRequest(
            `This coupon requires a minimum order of Rs ${Math.round(coupon.minOrderPaisa / 100)}`,
        );
    }
    if (coupon.perUserLimit && ctx.userId) {
        const used = await CouponRepository.countUsedByUser(coupon.id, ctx.userId);
        if (used >= coupon.perUserLimit) {
            throw AppError.badRequest("You have already used this coupon the maximum number of times");
        }
    }
};

export const couponDiscountAmount = (coupon: Coupon, netAfterPromoPaisa: number): number => {
    if (coupon.discountType === DiscountType.PERCENT) {
        return Math.min(percentOff(netAfterPromoPaisa, coupon.value), netAfterPromoPaisa);
    }
    return Math.min(coupon.value, netAfterPromoPaisa);
};

export const computeQuote = async (params: {
    gameIds: string[];
    couponCode?: string;
    userId?: string;
    requirePublished?: boolean;
}): Promise<PriceQuote> => {
    const gameIds = [...new Set(params.gameIds)];
    if (gameIds.length === 0) throw AppError.badRequest("No games to price");

    const games = await GameRepository.searchByIdsForQuote(gameIds, params.userId);
    const byId = new Map(games.map((g) => [g.id, g]));

    const missing = gameIds.filter((id) => !byId.get(id));
    if (missing.length > 0) throw AppError.notFound("One or more games were not found");

    if (params.requirePublished !== false) {
        const notPublished = games.filter((g) => g.status !== GameStatus.PUBLISHED);
        if (notPublished.length > 0) {
            throw AppError.badRequest(`"${notPublished[0].title}" is not available for purchase`);
        }
    }

    // Age gate (mature content): the buyer's birth_date must clear the
    // rating's required age. Checked at every checkout — never at render only.
    if (params.userId) {
        for (const game of games) {
            if (game.userBirthDate) {
                const required = AGE_REQUIREMENTS[game.ageRating] ?? 0;
                const age = ageFromBirthDate(game.userBirthDate);
                if (age < required) {
                    throw AppError.forbidden(
                        `"${game.title}" is rated ${game.ageRating} (${required}+) and cannot be purchased by this account`,
                    );
                }
            }
        }
    }

    // ---- Step 1-2: base prices, then the best active promotion per game ----
    const baseById = new Map(games.map((g) => [g.id, g.basePricePaisa]));
    const promoAlloc = await computePromotionDiscounts(gameIds, baseById);

    const items: QuoteItem[] = games.map((g) => ({
        gameId: g.id,
        title: g.title,
        slug: g.slug,
        ageRating: g.ageRating,
        publisherId: g.publisherId,
        revenueSharePct: g.revenueSharePct,
        basePricePaisa: g.basePricePaisa,
        promotionId: promoAlloc.byGame.get(g.id)?.promotionId ?? null,
        promotionDiscountPaisa: promoAlloc.byGame.get(g.id)?.discountPaisa ?? 0,
        priceAfterPromoPaisa: g.basePricePaisa - (promoAlloc.byGame.get(g.id)?.discountPaisa ?? 0),
        couponDiscountPaisa: 0,
        netPaisa: g.basePricePaisa - (promoAlloc.byGame.get(g.id)?.discountPaisa ?? 0),
        taxPaisa: 0,
    }));

    const subtotalPaisa = items.reduce((sum, i) => sum + i.basePricePaisa, 0);
    const promoDiscountPaisa = items.reduce((sum, i) => sum + i.promotionDiscountPaisa, 0);
    const netAfterPromoPaisa = items.reduce((sum, i) => sum + i.priceAfterPromoPaisa, 0);

    // ---- Step 3: coupon (allocated proportionally, never below zero) ----
    let coupon: Coupon | null = null;
    let couponDiscountPaisa = 0;

    if (params.couponCode) {
        const found = await CouponRepository.findByCode(params.couponCode);
        if (!found) throw AppError.badRequest("This coupon code is not valid");
        await validateCoupon(found, {
            userId: params.userId,
            netAfterPromoPaisa,
        });
        coupon = found;
        couponDiscountPaisa = couponDiscountAmount(found, netAfterPromoPaisa);

        const alloc = allocateProportional(
            couponDiscountPaisa,
            items.map((i) => i.priceAfterPromoPaisa),
        );
        items.forEach((item, idx) => {
            item.couponDiscountPaisa = alloc[idx];
            item.netPaisa = item.priceAfterPromoPaisa - item.couponDiscountPaisa;
        });
    }

    // ---- Step 4: VAT — rounded exactly once at the order level, then split
    // across items with largest remainders so items sum back to the order ----
    const taxConfig = await getEffectiveTaxConfig();
    const taxRateBps = taxConfig?.rateBps ?? 0;
    const netPaisa = items.reduce((sum, i) => sum + i.netPaisa, 0);
    const taxPaisa = bpsAmount(netPaisa, taxRateBps);
    const taxAlloc = allocateProportional(
        taxPaisa,
        items.map((i) => i.netPaisa),
    );
    items.forEach((item, idx) => {
        item.taxPaisa = taxAlloc[idx];
    });

    const totalPaisa = netPaisa + taxPaisa;

    return {
        items,
        subtotalPaisa,
        promoDiscountPaisa,
        couponDiscountPaisa,
        discountPaisa: promoDiscountPaisa + couponDiscountPaisa,
        netPaisa,
        taxPaisa,
        totalPaisa,
        taxRateBps,
        couponId: coupon?.id ?? null,
    };
};

/**
 * Promotion semantics (see promotionServices for the admin side):
 *   PERCENT — every covered game in the cart gets percent_off(base, pct);
 *             the best (largest) discount wins if several apply.
 *   FIXED   — one paisa amount off, apportioned across the covered games
 *             that are present in the cart (capped at their combined price).
 *   BUNDLE  — like FIXED, but only applies when EVERY game of the promotion
 *             is in the cart.
 * Overlapping windows per game are blocked at attach time, so at most one
 * promotion can ever cover a game at a given moment.
 */
const computePromotionDiscounts = async (
    gameIds: string[],
    baseById: Map<string, number>,
): Promise<{ byGame: Map<string, { discountPaisa: number; promotionId: string }> }> => {
    const byGame = new Map<string, { discountPaisa: number; promotionId: string }>();
    const rows = await PromotionGameRepository.findActiveForGames(gameIds);

    const cartSet = new Set(gameIds);
    const byPromotion = new Map<
        string,
        { type: string; value: number; games: Array<{ gameId: string; discountPct: number }> }
    >();
    for (const row of rows) {
        const promo = byPromotion.get(row.promotionId) ?? {
            type: row.type,
            value: row.value,
            games: [],
        };
        promo.games.push({ gameId: row.gameId, discountPct: row.discountPct });
        byPromotion.set(row.promotionId, promo);
    }

    for (const [promotionId, promo] of byPromotion) {
        if (promo.type === PromotionType.PERCENT) {
            for (const entry of promo.games) {
                if (!cartSet.has(entry.gameId)) continue;
                const base = baseById.get(entry.gameId) ?? 0;
                const discount = percentOff(base, entry.discountPct);
                const current = byGame.get(entry.gameId);
                if (!current || discount > current.discountPaisa) {
                    byGame.set(entry.gameId, { discountPaisa: discount, promotionId });
                }
            }
            continue;
        }

        // FIXED / BUNDLE
        const present = promo.games.filter((g) => cartSet.has(g.gameId));
        if (promo.type === PromotionType.BUNDLE && present.length !== promo.games.length) {
            continue; // bundle requires the full set in the cart
        }
        if (present.length === 0) continue;

        const bases = present.map((g) => baseById.get(g.gameId) ?? 0);
        const cap = bases.reduce((sum, b) => sum + b, 0);
        const value = Math.min(promo.value, cap);
        const alloc = allocateProportional(value, bases);

        present.forEach((entry, idx) => {
            const existing = byGame.get(entry.gameId);
            // A fixed/bundle slice only replaces a percent discount when it is
            // actually larger — best discount wins.
            if (!existing || alloc[idx] > existing.discountPaisa) {
                byGame.set(entry.gameId, { discountPaisa: alloc[idx], promotionId });
            }
        });
    }

    return { byGame };
};

/** Single-game summary for store pages (list + detail). */
export const priceSummaryForGame = async (gameId: string) => {
    const quote = await computeQuote({ gameIds: [gameId], requirePublished: false }).catch(
        () => null,
    );
    if (!quote) return null;
    const item = quote.items[0];
    return {
        basePricePaisa: item.basePricePaisa,
        promoDiscountPaisa: item.promotionDiscountPaisa,
        currentPricePaisa: item.priceAfterPromoPaisa,
        promotionId: item.promotionId,
        taxRateBps: quote.taxRateBps,
    };
};

// ---------------------------------------------------------------------------
// Admin: VAT configuration (effective-dated rows)
// ---------------------------------------------------------------------------
export const createTaxConfig = async (
    adminId: string,
    body: { name: string; rateBps: number; effectiveFrom: Date },
    ip?: string,
) => {
    if (body.rateBps < 0 || body.rateBps > 10000) {
        throw AppError.badRequest("rateBps must be between 0 and 10000");
    }
    const row = await TaxConfigRepository.create(body);
    await audit({
        actorId: adminId,
        action: AUDIT_ACTIONS.TAX_CONFIG_CREATED,
        entity: "tax_config",
        entityId: row.id,
        diff: body,
        ip,
    });
    return row;
};

export const listTaxConfigs = async () => TaxConfigRepository.listAll();

// Re-exported for gameServices (quote-by-ids needs publisher shares joined).
export type { Game };
