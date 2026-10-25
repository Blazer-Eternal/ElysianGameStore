import { GameKeyStatus } from "../enums/gameKeyStatusEnum";

// Only the SHA-256 hash of the key is stored. Reservations expire after
// reservedUntil; a row-locking redeem transition prevents double-selling.
export interface IGameKey {
    id: string;
    gameId: string;
    keyHash: string;
    status: GameKeyStatus;
    reservedUntil?: Date | null;
    reservedBy?: string | null;
    redeemedBy?: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export type IGameKeyCreation = Omit<IGameKey, "id" | "createdAt" | "updatedAt">;
