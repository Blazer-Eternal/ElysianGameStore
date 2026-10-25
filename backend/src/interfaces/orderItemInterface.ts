// Full price snapshot taken at checkout: unit price, promotion and coupon
// splits, tax and the publisher's revenue share at that moment. Later pricing
// changes never alter history — this is the audit trail payouts run on.
export interface IOrderItem {
    id: string;
    orderId: string;
    gameId: string;
    unitPricePaisa: number; // base price snapshot
    promotionDiscountPaisa: number;
    couponDiscountPaisa: number;
    discountPaisa: number; // promotion + coupon (<= unitPricePaisa)
    taxPaisa: number;
    publisherId: string;
    revenueSharePct: number;
    createdAt: Date;
}

export type IOrderItemCreation = Omit<IOrderItem, "id" | "createdAt">;
