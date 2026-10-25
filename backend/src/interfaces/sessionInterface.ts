// Opaque refresh-token sessions. Only the SHA-256 hash of the token is stored;
// rotation on /refresh revokes the old row, refresh tokens are validated
// against expiry and revocation on every use.
export interface ISession {
    id: string;
    userId: string;
    refreshTokenHash: string;
    userAgent?: string | null;
    ip?: string | null;
    expiresAt: Date;
    revokedAt?: Date | null;
    createdAt: Date;
}

export type ISessionCreation = Omit<ISession, "id" | "createdAt">;
