// Game keys (optional delivery channel). Reservations expire after
// reserved_until so an abandoned checkout cannot double-sell or lock a key
// forever; the sweeper returns expired reservations to AVAILABLE.
export enum GameKeyStatus {
    AVAILABLE = "AVAILABLE",
    RESERVED = "RESERVED",
    REDEEMED = "REDEEMED",
}

export const GAME_KEY_STATUSES = Object.values(GameKeyStatus);
