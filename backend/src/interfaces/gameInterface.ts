import { AgeRating } from "../enums/ageRatingEnum";
import { GameStatus } from "../enums/gameStatusEnum";

// base_price_paisa >= 0 (0 = free-to-play). Prices are integers in paisa.
export interface IGame {
    id: string;
    publisherId: string;
    title: string;
    slug: string;
    shortDesc: string;
    longDesc?: string | null;
    releaseDate?: Date | null;
    ageRating: AgeRating;
    basePricePaisa: number;
    currency: string;
    status: GameStatus;
    isEarlyAccess: boolean;
    publishedAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

export type IGameCreation = Omit<IGame, "id" | "createdAt" | "updatedAt">;
