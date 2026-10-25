import { GiftStatus } from "../enums/giftStatusEnum";

// Created at PAID time instead of a library entry (gift checkout, single-item
// orders only). redeemToken is single-use; the recipient's email must match.
export interface IGift {
    id: string;
    senderId: string;
    recipientEmail: string;
    gameId: string;
    orderItemId?: string | null;
    status: GiftStatus;
    redeemToken: string;
    expiresAt: Date;
    redeemedBy?: string | null;
    redeemedAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

export type IGiftCreation = Omit<IGift, "id" | "createdAt" | "updatedAt">;
