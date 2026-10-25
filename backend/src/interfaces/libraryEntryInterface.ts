import { LibrarySource } from "../enums/librarySourceEnum";

// The ownership table (unique userId+gameId). Refunds/chargebacks set
// revoked_at instead of deleting, preserving the legal trail.
export interface ILibraryEntry {
    id: string;
    userId: string;
    gameId: string;
    orderItemId?: string | null;
    acquiredAt: Date;
    source: LibrarySource;
    revokedAt?: Date | null;
    createdAt: Date;
}

export type ILibraryEntryCreation = Omit<ILibraryEntry, "id" | "createdAt">;
