import { DiscountType } from "../enums/discountTypeEnum";

// code is unique. usedCount <= maxUses is enforced atomically with a
// conditional UPDATE at checkout (reserve) and release on FAILED orders.
export interface ICoupon {
    id: string;
    code: string;
    discountType: DiscountType;
    value: number; // percent (1-90) or paisa, per discountType
    maxUses: number;
    usedCount: number;
    perUserLimit?: number | null;
    minOrderPaisa: number;
    expiresAt?: Date | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export type ICouponCreation = Omit<ICoupon, "id" | "createdAt" | "updatedAt">;
