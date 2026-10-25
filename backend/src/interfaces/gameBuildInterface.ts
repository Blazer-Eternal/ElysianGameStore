import { Platform } from "../enums/platformEnum";

// Unique (gameId, version, platform). Exactly one active build per platform
// (partial unique index); checksums are verified on download.
export interface IGameBuild {
    id: string;
    gameId: string;
    version: string; // semver
    platform: Platform;
    fileSizeBytes: number;
    checksumSha256: string; // 64 hex chars
    cdnUrl: string;
    changelog?: string | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export type IGameBuildCreation = Omit<IGameBuild, "id" | "createdAt" | "updatedAt">;
