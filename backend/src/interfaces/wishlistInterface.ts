// Unique (userId, gameId). A promotion starting for a wishlisted game
// triggers a PROMOTION notification (see promotionServices.fanOut).
export interface IWishlist {
    userId: string;
    gameId: string;
    addedAt: Date;
    createdAt: Date;
}

export type IWishlistCreation = Omit<IWishlist, "createdAt">;
