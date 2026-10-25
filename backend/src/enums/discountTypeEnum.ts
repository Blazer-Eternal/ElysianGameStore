// Coupon discount shapes. Percent coupons take a percent (1-90); fixed
// coupons take paisa off. A coupon can never drive an order below zero.
export enum DiscountType {
    PERCENT = "PERCENT",
    FIXED = "FIXED",
}

export const DISCOUNT_TYPES = Object.values(DiscountType);
