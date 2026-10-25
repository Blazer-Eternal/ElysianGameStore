import { FundedBy } from "../enums/fundedByEnum";
import { PromotionType } from "../enums/promotionTypeEnum";

// endsAt must be > startsAt. Percent promotions: 0 < value <= 90. Fixed:
// value in paisa. A promotion's games are attached via promotion_games; no
// game may sit in two promotions whose windows overlap.
export interface IPromotion {
    id: string;
    name: string;
    type: PromotionType;
    value: number;
    startsAt: Date;
    endsAt: Date;
    fundedBy: FundedBy;
    createdBy: string;
    notifiedAt?: Date | null; // set after wishlist fan-out (idempotency flag)
    createdAt: Date;
    updatedAt: Date;
}

export type IPromotionCreation = Omit<IPromotion, "id" | "createdAt" | "updatedAt">;
