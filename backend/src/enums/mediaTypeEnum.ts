// Exactly one COVER per game (partial unique index on game_media).
export enum MediaType {
    COVER = "COVER",
    SCREENSHOT = "SCREENSHOT",
    TRAILER = "TRAILER",
}

export const MEDIA_TYPES = Object.values(MediaType);
