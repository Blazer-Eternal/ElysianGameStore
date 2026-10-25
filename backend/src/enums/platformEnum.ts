// Build platforms. One active build per (game, platform) — enforced by a
// partial unique index and by buildServices.activate.
export enum Platform {
    WINDOWS = "WINDOWS",
    LINUX = "LINUX",
}

export const PLATFORMS = Object.values(Platform);
