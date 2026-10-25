// Unique (promotionId, gameId). discountPct is the per-game discount the
// promotion grants (equals promotion.value for PERCENT promotions).
export interface IPromotionGame {
    id: string;
    promotionId: string;
    gameId: string;
    discountPct: number;
    createdAt: Date;
}

export type IPromotionGameCreation = Omit<IPromotionGame, "id" | "createdAt">;
