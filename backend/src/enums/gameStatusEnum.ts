// Publishing gate: a game can only move to PUBLISHED when it has an active
// build, 3+ screenshots, one cover and both MIN + REC system requirements
// (enforced in gameServices.assertPublishable).
export enum GameStatus {
    DRAFT = "DRAFT",
    IN_REVIEW = "IN_REVIEW",
    PUBLISHED = "PUBLISHED",
    DELISTED = "DELISTED",
}

export const GAME_STATUSES = Object.values(GameStatus);

export const CUSTOMER_VISIBLE_GAME_STATUSES: GameStatus[] = [GameStatus.PUBLISHED];
