import { GameStatus } from "../enums/gameStatusEnum";
import Cart from "../models/cartModel";
import Game from "../models/gameModel";
import { CartItemRepository, CartRepository, LibraryEntryRepository } from "../repositories";
import AppError from "../utils/appError";
import { computeQuote, PriceQuote } from "./pricingServices";

// One cart per user for life — created lazily, emptied as orders are paid.
export const getOrCreateCart = async (userId: string): Promise<Cart> =>
    CartRepository.findOrCreateByUser(userId);

export const getCart = async (userId: string): Promise<{
    cartId: string;
    items: Array<{
        gameId: string;
        title: string;
        slug: string;
        coverUrl: string | null;
        basePricePaisa: number;
        promoDiscountPaisa: number;
        currentPricePaisa: number;
        addedAt: Date;
    }>;
    subtotalPaisa: number;
    promoDiscountPaisa: number;
    totalBeforeTaxPaisa: number;
    quote: PriceQuote | null;
}> => {
    const cart = await getOrCreateCart(userId);
    const items = await CartItemRepository.listByCart(cart.id);

    const gameIds = items.map((i) => i.gameId);
    const quote =
        gameIds.length > 0
            ? await computeQuote({ gameIds, userId, requirePublished: false }).catch(() => null)
            : null;

    const coverByGame = new Map<string, string | null>();
    for (const item of items) {
        const game = item.game as unknown as Game | undefined;
        if (game) coverByGame.set(game.id, null);
    }

    return {
        cartId: cart.id,
        items: items.map((item) => {
            const game = item.game as unknown as Game | undefined;
            const quoted = quote?.items.find((q) => q.gameId === item.gameId);
            return {
                gameId: item.gameId,
                title: game?.title ?? "(unavailable)",
                slug: game?.slug ?? "",
                coverUrl: coverByGame.get(item.gameId) ?? null,
                basePricePaisa: quoted?.basePricePaisa ?? game?.basePricePaisa ?? 0,
                promoDiscountPaisa: quoted?.promotionDiscountPaisa ?? 0,
                currentPricePaisa: quoted?.priceAfterPromoPaisa ?? game?.basePricePaisa ?? 0,
                addedAt: item.addedAt,
            };
        }),
        subtotalPaisa: quote?.subtotalPaisa ?? 0,
        promoDiscountPaisa: quote?.promoDiscountPaisa ?? 0,
        totalBeforeTaxPaisa: quote?.netPaisa ?? 0,
        quote,
    };
};

// Rules: the game must be PUBLISHED, must not already be owned (active
// library entry) and must not already be in the cart.
export const addItem = async (userId: string, gameId: string, ip?: string) => {
    void ip;
    const cart = await getOrCreateCart(userId);

    const game = await Game.findByPk(gameId);
    if (!game || game.status !== GameStatus.PUBLISHED) {
        throw AppError.badRequest("This game cannot be added to the cart");
    }
    if (await LibraryEntryRepository.anyActiveOwned(userId, [gameId])) {
        throw AppError.badRequest("You already own this game");
    }
    if (await CartItemRepository.findByCartAndGame(cart.id, gameId)) {
        return { alreadyInCart: true };
    }

    await CartItemRepository.create({ cartId: cart.id, gameId, addedAt: new Date() });
    return getCart(userId);
};

export const removeItem = async (userId: string, gameId: string) => {
    const cart = await getOrCreateCart(userId);
    const removed = await CartItemRepository.deleteByCartAndGame(cart.id, gameId);
    if (removed === 0) throw AppError.notFound("Game not in cart");
    return getCart(userId);
};

export const clear = async (userId: string): Promise<void> => {
    const cart = await getOrCreateCart(userId);
    const items = await CartItemRepository.listByCart(cart.id);
    await CartItemRepository.clearCart(
        cart.id,
        items.map((i) => i.gameId),
    );
};
