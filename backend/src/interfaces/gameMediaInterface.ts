import { MediaType } from "../enums/mediaTypeEnum";

// Exactly one COVER per game — enforced by a partial unique index.
export interface IGameMedia {
    id: string;
    gameId: string;
    type: MediaType;
    url: string;
    sortOrder: number;
    createdAt: Date;
    updatedAt: Date;
}

export type IGameMediaCreation = Omit<IGameMedia, "id" | "createdAt" | "updatedAt">;
