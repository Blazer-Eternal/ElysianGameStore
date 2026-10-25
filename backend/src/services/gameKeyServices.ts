import { createHash, randomBytes } from "crypto";

import { Database } from "../config";
import { GameKeyStatus } from "../enums/gameKeyStatusEnum";
import { LibrarySource } from "../enums/librarySourceEnum";
import { NotificationType } from "../enums/notificationTypeEnum";
import {
    GameBuildRepository,
    GameKeyRepository,
    LibraryEntryRepository,
} from "../repositories";
import AppError from "../utils/appError";
import { audit, AUDIT_ACTIONS } from "./auditServices";
import { grantLibraryEntry } from "./licenseServices";
import { send } from "./notificationServices";

const { sequelize } = Database;

const hashKey = (code: string): string =>
    createHash("sha256").update(code.toUpperCase().replace(/[^A-Z0-9]/g, "")).digest("hex");

const formatKey = (raw: string): string =>
    raw.match(/.{1,4}/g)?.join("-") ?? raw;

// Publisher/admin generates keys for a game. The plaintext keys are returned
// exactly once — only their SHA-256 hash is stored (spec: key_hash).
export const generate = async (
    gameId: string,
    count: number,
): Promise<{ keys: string[]; count: number }> => {
    if (count < 1 || count > 500) throw AppError.badRequest("Generate between 1 and 500 keys");
    const keys: string[] = [];
    const rows: Array<{ gameId: string; keyHash: string }> = [];
    for (let i = 0; i < count; i += 1) {
        const code = formatKey(randomBytes(8).toString("hex").toUpperCase());
        keys.push(code);
        rows.push({ gameId, keyHash: hashKey(code) });
    }
    await GameKeyRepository.bulkCreate(rows);
    return { keys, count };
};

export const listForGame = async (gameId: string, status?: string) =>
    GameKeyRepository.listByGame(gameId, status);

export const summaryForGame = async (gameId: string) =>
    GameKeyRepository.countByGameAndStatus(gameId);

/**
 * Redeem: SELECT … FOR UPDATE serializes concurrent attempts; the
 * AVAILABLE → REDEEMED transition happens exactly once (no double-selling).
 */
export const redeem = async (userId: string, code: string, ip?: string) => {
    // Return expired reservations first so a stale hold can't block a user.
    await GameKeyRepository.releaseExpiredReservations();

    const keyHash = hashKey(code);

    const key = await sequelize.transaction(async (t) => {
        const locked = await GameKeyRepository.lockByHash(keyHash, t);
        if (!locked) throw AppError.badRequest("This key is not valid");
        if (locked.status === GameKeyStatus.REDEEMED) {
            throw AppError.conflict("This key has already been redeemed");
        }
        if (locked.status === GameKeyStatus.RESERVED) {
            throw AppError.conflict("This key is currently reserved");
        }

        if (await LibraryEntryRepository.anyActiveOwned(userId, [locked.gameId])) {
            throw AppError.conflict("You already own this game");
        }

        await locked.update(
            { status: GameKeyStatus.REDEEMED, redeemedBy: userId },
            { transaction: t },
        );
        return locked;
    });

    await grantLibraryEntry(userId, key.gameId, LibrarySource.KEY, null);
    await send(
        userId,
        NotificationType.ORDER,
        "Key redeemed",
        "The game from your key is now in your library.",
        { gameId: key.gameId },
    );
    await audit({
        actorId: userId,
        action: AUDIT_ACTIONS.GAME_KEY_REDEEMED,
        entity: "game_key",
        entityId: key.id,
        diff: { gameId: key.gameId },
        ip,
    });

    return { gameId: key.gameId, status: key.status };
};

export const releaseExpiredReservations = (): Promise<number> =>
    GameKeyRepository.releaseExpiredReservations();

export { GameBuildRepository };
