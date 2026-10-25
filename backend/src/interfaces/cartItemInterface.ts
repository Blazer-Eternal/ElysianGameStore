// Unique (cartId, gameId). A game already owned (active library entry) can
// never be added (checked in cartServices).
export interface ICartItem {
    id: string;
    cartId: string;
    gameId: string;
    addedAt: Date;
    createdAt: Date;
}

export type ICartItemCreation = Omit<ICartItem, "id" | "createdAt">;
