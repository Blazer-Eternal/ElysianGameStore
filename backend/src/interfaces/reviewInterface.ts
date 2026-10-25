import { ModerationStatus } from "../enums/moderationStatusEnum";

// Owners only (unique userId+gameId, verified against the library).
// playtimeMinutes is snapshotted from PlaySessions at write time.
export interface IReview {
    id: string;
    userId: string;
    gameId: string;
    recommend: boolean;
    rating?: number | null; // optional 1-5
    body?: string | null;
    playtimeMinutes: number;
    helpfulCount: number;
    moderationStatus: ModerationStatus;
    createdAt: Date;
    updatedAt: Date;
}

export type IReviewCreation = Omit<IReview, "id" | "createdAt" | "updatedAt">;
