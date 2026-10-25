// PERCENT carries a percent value (0 < value <= 90); FIXED and BUNDLE carry
// integer paisa off — a BUNDLE discount only applies when every game of the
// promotion is in the cart (see pricingServices.computePromotionDiscounts).
export enum PromotionType {
    PERCENT = "PERCENT",
    FIXED = "FIXED",
    BUNDLE = "BUNDLE",
}

export const PROMOTION_TYPES = Object.values(PromotionType);
