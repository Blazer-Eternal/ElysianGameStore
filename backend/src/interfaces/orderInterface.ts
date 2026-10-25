import { OrderStatus } from "../enums/orderStatusEnum";

// totalPaisa = subtotalPaisa - discountPaisa + taxPaisa. Immutable once PAID
// — later price/promo changes never touch history.
export interface IOrder {
    id: string;
    userId: string;
    status: OrderStatus;
    subtotalPaisa: number;
    discountPaisa: number;
    taxPaisa: number;
    totalPaisa: number;
    currency: string;
    couponId?: string | null;
    /** Set for gift checkouts: the single item is delivered as a Gift token. */
    giftRecipientEmail?: string | null;
    paidAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

export type IOrderCreation = Omit<IOrder, "id" | "createdAt" | "updatedAt">;
