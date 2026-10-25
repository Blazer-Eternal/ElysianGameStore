import { randomBytes } from "crypto";

import { Transaction } from "sequelize";

import { commerceConfig } from "../config";
import { LibraryEntryRepository, OrderItemRepository, OrderRepository, CartRepository, CartItemRepository, CouponRepository } from "../repositories";
import AppError from "../utils/appError";
import { computeQuote, PriceQuote } from "./pricingServices";
import { audit, AUDIT_ACTIONS } from "./auditServices";
import { Database } from "../config";

const { sequelize } = Database;

// ---------------------------------------------------------------------------
// Checkout (POST /orders): everything is recomputed server-side — the client
// only names the games and the coupon. A PENDING order is created in one
// transaction together with its snapshot items and (if used) the atomic
// coupon reservation.
// ---------------------------------------------------------------------------
export const createOrder = async (
    userId: string,
    body: { gameIds?: string[]; couponCode?: string; giftRecipientEmail?: string },
    ip?: string,
): Promise<{ orderId: string; quote: PriceQuote }> => {
    let gameIds = body.gameIds;
    if (!gameIds || gameIds.length === 0) {
        const cart = await CartRepository.findByUser(userId);
        if (!cart) throw AppError.badRequest("Your cart is empty");
        const cartItems = await CartItemRepository.listByCart(cart.id);
        gameIds = cartItems.map((i) => i.gameId);
    }
    if (gameIds.length === 0) throw AppError.badRequest("Your cart is empty");

    if (body.giftRecipientEmail && gameIds.length > 1) {
        throw AppError.badRequest("Gift checkout is limited to a single game");
    }

    // Ownership guard: a game already owned can never be bought again.
    const owned = await LibraryEntryRepository.anyActiveOwned(userId, gameIds);
    if (owned) throw AppError.badRequest("One or more games in this order are already in your library");

    // Full server-side quote: base price − best promotion − coupon + VAT.
    const quote = await computeQuote({
        gameIds,
        couponCode: body.couponCode,
        userId,
        requirePublished: true,
    });

    const orderId = await sequelize.transaction(async (t) => {
        // Atomic coupon reservation (used_count < max_uses enforced in SQL).
        let couponId = quote.couponId;
        if (couponId) {
            const reserved = await CouponRepository.reserveAtomic(couponId, t);
            if (!reserved) {
                throw AppError.conflict("This coupon can no longer be used");
            }
        }

        const order = await OrderRepository.create(
            {
                userId,
                status: "PENDING" as never,
                subtotalPaisa: quote.subtotalPaisa,
                discountPaisa: quote.discountPaisa,
                taxPaisa: quote.taxPaisa,
                totalPaisa: quote.totalPaisa,
                currency: "NPR",
                couponId: couponId ?? null,
                giftRecipientEmail: body.giftRecipientEmail?.toLowerCase() ?? null,
                paidAt: null,
            },
            t,
        );

        // Full price snapshot per item — later price changes never alter it.
        for (const item of quote.items) {
            await OrderItemRepository.create(
                {
                    orderId: order.id,
                    gameId: item.gameId,
                    unitPricePaisa: item.basePricePaisa,
                    promotionDiscountPaisa: item.promotionDiscountPaisa,
                    couponDiscountPaisa: item.couponDiscountPaisa,
                    discountPaisa: item.promotionDiscountPaisa + item.couponDiscountPaisa,
                    taxPaisa: item.taxPaisa,
                    publisherId: item.publisherId,
                    revenueSharePct: item.revenueSharePct,
                },
                t,
            );
        }

        await audit({
            actorId: userId,
            action: AUDIT_ACTIONS.ORDER_CREATED,
            entity: "order",
            entityId: order.id,
            diff: { totalPaisa: quote.totalPaisa, items: quote.items.length },
            ip,
            transaction: t,
        });

        return order.id;
    });

    return { orderId, quote };
};

export const getQuoteOnly = async (
    userId: string,
    body: { gameIds?: string[]; couponCode?: string },
): Promise<PriceQuote> => {
    let gameIds = body.gameIds;
    if (!gameIds || gameIds.length === 0) {
        const cart = await CartRepository.findByUser(userId);
        if (cart) {
            const cartItems = await CartItemRepository.listByCart(cart.id);
            gameIds = cartItems.map((i) => i.gameId);
        }
    }
    if (!gameIds || gameIds.length === 0) throw AppError.badRequest("No games to quote");
    return computeQuote({ gameIds, couponCode: body.couponCode, userId, requirePublished: true });
};

export const cancelOrder = async (userId: string, orderId: string, ip?: string) => {
    const order = await OrderRepository.findById(orderId);
    if (!order || order.userId !== userId) throw AppError.notFound("Order not found");
    if (order.status !== "PENDING") {
        throw AppError.badRequest("Only pending orders can be cancelled");
    }

    await sequelize.transaction(async (t) => {
        await OrderRepository.updateById(orderId, { status: "FAILED" as never }, t);
        if (order.couponId) await CouponRepository.releaseAtomic(order.couponId, t);
        await audit({
            actorId: userId,
            action: AUDIT_ACTIONS.ORDER_CANCELLED,
            entity: "order",
            entityId: orderId,
            ip,
            transaction: t,
        });
    });
    return OrderRepository.findById(orderId);
};

// Sweep: PENDING orders older than the TTL expire and their coupon
// reservation is released.
export const expirePendingOrders = async (): Promise<number> => {
    const cutoff = new Date(Date.now() - commerceConfig.pendingOrderTtlHours * 3600 * 1000);
    const expired = await OrderRepository.listExpiredPending(cutoff);
    for (const order of expired) {
        await sequelize.transaction(async (t) => {
            const [updated] = await OrderRepository.updateById(
                order.id,
                { status: "FAILED" as never },
                t,
            );
            if (updated === 0) return; // another sweep got it
            if (order.couponId) await CouponRepository.releaseAtomic(order.couponId, t);
            await audit({
                action: AUDIT_ACTIONS.ORDER_EXPIRED,
                entity: "order",
                entityId: order.id,
                transaction: t,
            });
        });
    }
    return expired.length;
};

export type { Transaction };
