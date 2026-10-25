import { Database } from "../config";
import { LibraryEntryRepository, PlaySessionRepository } from "../repositories";
import AppError from "../utils/appError";

const { sequelize } = Database;

// Postgres unique_violation — the partial index play_sessions_one_open_idx
// (user_id, game_id) WHERE ended_at IS NULL fires under a true race.
const UNIQUE_VIOLATION = "23505";

// Play sessions feed the refund eligibility check ("hours played") and the
// playtime snapshot on reviews. Starting a session requires the license.
export const start = async (userId: string, gameId: string) => {
    const entry = await LibraryEntryRepository.findActiveByUserAndGame(userId, gameId);
    if (!entry) throw AppError.forbidden("You do not own this game");
    // A retry / double-click must not leave two OPEN sessions for the same
    // game: sumMinutes adds (NOW - started_at) per open row, so overlapping
    // sessions double-count wall-clock time and could wrongly fail the refund
    // eligibility check. Close-then-insert runs in one transaction, and the
    // one-open-per-user-game partial index backstops any remaining race: the
    // loser of a concurrent insert simply closes the winner's row and retries
    // once, so the client always gets exactly one live session back.
    const open = () =>
        sequelize.transaction(async (t) => {
            await PlaySessionRepository.closeOpen(userId, gameId, new Date(), t);
            return PlaySessionRepository.create(
                { userId, gameId, startedAt: new Date(), endedAt: null },
                t,
            );
        });

    try {
        return await open();
    } catch (error) {
        if ((error as { original?: { code?: string } })?.original?.code !== UNIQUE_VIOLATION) throw error;
        return open();
    }
};

export const stop = async (userId: string, sessionId: string) => {
    const session = await PlaySessionRepository.findById(sessionId);
    if (!session || session.userId !== userId) throw AppError.notFound("Session not found");
    if (session.endedAt) return session;

    const endedAt = new Date();
    await PlaySessionRepository.close(sessionId, endedAt);
    const minutes = Math.max(
        0,
        Math.round((endedAt.getTime() - new Date(session.startedAt).getTime()) / 60000),
    );
    return { ...(await PlaySessionRepository.findById(sessionId))?.toJSON(), minutesPlayed: minutes };
};

export const totalPlaytimeMinutes = async (userId: string, gameId: string): Promise<number> =>
    PlaySessionRepository.sumMinutes(userId, gameId);
