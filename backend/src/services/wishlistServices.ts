import { GameStatus } from "../enums/gameStatusEnum";
import { GameRepository, LibraryEntryRepository, WishlistRepository } from "../repositories";
import AppError from "../utils/appError";

// Wishlist drives the promotion-notification fan-out (see promotionServices).
// Only published, unowned games can be wishlisted.
export const add = async (userId: string, gameId: string) => {
    const game = await GameRepository.findById(gameId);
    if (!game || game.status !== GameStatus.PUBLISHED) {
        throw AppError.badRequest("This game cannot be wishlisted");
    }
    if (await LibraryEntryRepository.anyActiveOwned(userId, [gameId])) {
        throw AppError.badRequest("You already own this game");
    }
    const added = await WishlistRepository.add(userId, gameId);
    return { added, gameId };
};

export const remove = async (userId: string, gameId: string): Promise<boolean> => {
    const removed = await WishlistRepository.remove(userId, gameId);
    if (removed === 0) throw AppError.notFound("Game not in your wishlist");
    return true;
};

export const list = async (userId: string, params: { page: number; pageSize: number }) => {
    const { rows, count } = await WishlistRepository.listByUser(userId, {
        limit: params.pageSize,
        offset: (params.page - 1) * params.pageSize,
    });
    return {
        items: rows.map((w) => ({
            gameId: w.gameId,
            addedAt: w.addedAt,
            game: w.game,
        })),
        total: count,
        page: params.page,
        pageSize: params.pageSize,
    };
};
