import { Database } from "../config";
import { GiftStatus } from "../enums/giftStatusEnum";
import { LibrarySource } from "../enums/librarySourceEnum";
import { NotificationType } from "../enums/notificationTypeEnum";
import Gift from "../models/giftModel";
import { GiftRepository, LibraryEntryRepository, NotificationRepository } from "../repositories";
import AppError from "../utils/appError";
import { audit, AUDIT_ACTIONS } from "./auditServices";

const { sequelize } = Database;

const toPublic = (gift: Gift, game?: unknown) => ({
    id: gift.id,
    status: gift.status,
    recipientEmail: gift.recipientEmail,
    gameId: gift.gameId,
    game,
    expiresAt: gift.expiresAt,
    redeemedAt: gift.redeemedAt,
    createdAt: gift.createdAt,
});

export const listMine = async (userId: string, email: string) => {
    const [sent, received] = await Promise.all([
        GiftRepository.listBySender(userId),
        GiftRepository.listByRecipientEmail(email),
    ]);
    return {
        // redeemToken is only exposed to the SENDER: the gift link
        // (/api/gifts/{token}) must be shareable, and until now the token was
        // written at fulfilment but never returned by any endpoint, making
        // redemption impossible via the API. The preview endpoint already
        // reveals gift details to anyone holding the token, so this leaks
        // nothing new; recipients see the token implicitly through the link.
        sent: sent.map((g) => ({ ...toPublic(g), redeemToken: g.redeemToken })),
        received: received.map((g) => toPublic(g)),
    };
};

// Token preview so the recipient sees what they are about to redeem.
export const preview = async (token: string) => {
    const gift = await GiftRepository.findByToken(token);
    if (!gift) throw AppError.notFound("Gift not found");
    return toPublic(gift);
};

// Single-use redemption: token must be PENDING and unexpired, the recipient
// email must match the account, and the recipient must not already own it.
export const redeem = async (userId: string, email: string, token: string, ip?: string) => {
    const gift = await GiftRepository.findByToken(token);
    if (!gift) throw AppError.notFound("Gift not found");

    if (gift.status === GiftStatus.REDEEMED) {
        throw AppError.conflict("This gift has already been redeemed");
    }
    if (gift.status === GiftStatus.CANCELLED) {
        throw AppError.badRequest("This gift was cancelled");
    }
    if (gift.status === GiftStatus.PENDING && gift.expiresAt.getTime() < Date.now()) {
        await GiftRepository.updateById(gift.id, { status: GiftStatus.EXPIRED });
        throw AppError.badRequest("This gift has expired");
    }
    if (gift.recipientEmail.toLowerCase() !== email.toLowerCase()) {
        throw AppError.forbidden("This gift was sent to a different email address");
    }
    if (await LibraryEntryRepository.anyActiveOwned(userId, [gift.gameId])) {
        throw AppError.conflict("You already own this game");
    }

    await sequelize.transaction(async (t) => {
        const [updated] = await GiftRepository.updateById(
            gift.id,
            { status: GiftStatus.REDEEMED, redeemedBy: userId, redeemedAt: new Date() },
            t,
        );
        if (updated === 0) {
            // Concurrent redeem lost the race.
            throw AppError.conflict("This gift has already been redeemed");
        }
        await LibraryEntryRepository.createIfAbsent(
            {
                userId,
                gameId: gift.gameId,
                orderItemId: gift.orderItemId ?? null,
                acquiredAt: new Date(),
                source: LibrarySource.GIFT,
            },
            t,
        );
    });

    await NotificationRepository.create({
        userId: gift.senderId,
        type: NotificationType.GIFT,
        title: "Gift redeemed",
        body: "Your gift has been redeemed. Enjoy!",
        data: { giftId: gift.id, gameId: gift.gameId },
        readAt: null,
        convertedAt: null,
    });

    await audit({
        actorId: userId,
        action: AUDIT_ACTIONS.GIFT_REDEEMED,
        entity: "gift",
        entityId: gift.id,
        ip,
    });

    return GiftRepository.findById(gift.id);
};

export const expirePending = async (): Promise<number> => GiftRepository.expirePending();
