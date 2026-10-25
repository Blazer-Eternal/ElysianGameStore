// Append-only audit trail: price changes, refunds, role changes, publisher
// verifications, payout releases. Never updated, never deleted.
export interface IAuditLog {
    id: string;
    actorId?: string | null;
    action: string; // e.g. "GAME_PRICE_CHANGED"
    entity: string; // e.g. "game"
    entityId: string;
    diff?: unknown | null;
    ip?: string | null;
    createdAt: Date;
}

export type IAuditLogCreation = Omit<IAuditLog, "id" | "createdAt">;
