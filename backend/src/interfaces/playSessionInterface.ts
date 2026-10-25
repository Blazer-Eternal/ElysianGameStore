// Feeds refund eligibility ("hours played") and the playtime badge. The
// sweeper closes sessions left open for more than a day.
export interface IPlaySession {
    id: string;
    userId: string;
    gameId: string;
    startedAt: Date;
    endedAt?: Date | null;
    createdAt: Date;
}

export type IPlaySessionCreation = Omit<IPlaySession, "id" | "createdAt">;
