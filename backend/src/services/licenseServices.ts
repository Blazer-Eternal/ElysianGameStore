import { randomBytes } from "crypto";

import { commerceConfig } from "../config";
import { LibrarySource } from "../enums/librarySourceEnum";
import { GiftStatus } from "../enums/giftStatusEnum";
import { NotificationType } from "../enums/notificationTypeEnum";
import { Platform } from "../enums/platformEnum";
import Order from "../models/orderModel";
import { Transaction } from "sequelize";
import {
    CartItemRepository,
    GameBuildRepository,
    GiftRepository,
    LibraryEntryRepository,
    NotificationRepository,
    OrderItemRepository,
    WishlistRepository,
} from "../repositories";
import AppError from "../utils/appError";
import { signCdnUrl } from "../utils/signature";
import { send } from "./notificationServices";

// ---------------------------------------------------------------------------
// Fulfilment — runs inside the payment webhook transaction, exactly once per
// PAID transition. Every purchased item becomes either a LibraryEntry (own
// play) or a Gift token (gift checkout); the wishlist is cleared and wishlist
// → sale conversion is recorded.
// ---------------------------------------------------------------------------
export const fulfillOrder = async (order: Order, transaction: Transaction): Promise<void> => {
    const items = await OrderItemRepository.listByOrder(order.id);

    for (const item of items) {
        if (order.giftRecipientEmail) {
            await GiftRepository.create(
                {
                    senderId: order.userId,
                    recipientEmail: order.giftRecipientEmail,
                    gameId: item.gameId,
                    orderItemId: item.id,
                    status: GiftStatus.PENDING,
                    redeemToken: randomBytes(24).toString("hex"),
                    expiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000),
                    redeemedBy: null,
                    redeemedAt: null,
                },
                transaction,
            );
        } else {
            await LibraryEntryRepository.createIfAbsent(
                {
                    userId: order.userId,
                    gameId: item.gameId,
                    orderItemId: item.id,
                    acquiredAt: new Date(),
                    source: LibrarySource.PURCHASE,
                },
                transaction,
            );
        }

        // Wishlist-driven sale conversion tracking: the promotion notification
        // (if any) is stamped converted, and the wishlist row is removed.
        await NotificationRepository.markPromotionConverted(order.userId, item.gameId);
        await WishlistRepository.remove(order.userId, item.gameId).catch(() => 0);
    }

    // Clear the purchased games from the user's cart.
    await CartItemRepository.clearCartByGames(
        order.userId,
        items.map((i) => i.gameId),
        transaction,
    );

    await send(
        order.userId,
        NotificationType.ORDER,
        order.giftRecipientEmail ? "Gift purchase complete" : "Purchase complete",
        order.giftRecipientEmail
            ? `Your gift for ${order.giftRecipientEmail} is ready to share.`
            : "Your games are now in your library.",
        { orderId: order.id },
        transaction,
    );
};

// ---------------------------------------------------------------------------
// Library
// ---------------------------------------------------------------------------
export const getLibrary = async (
    userId: string,
    params: { includeRevoked?: boolean; page: number; pageSize: number },
) => {
    const { rows, count } = await LibraryEntryRepository.listByUser(userId, {
        includeRevoked: params.includeRevoked,
        limit: params.pageSize,
        offset: (params.page - 1) * params.pageSize,
    });
    return {
        entries: rows.map((entry) => ({
            id: entry.id,
            gameId: entry.gameId,
            game: entry.game,
            acquiredAt: entry.acquiredAt,
            source: entry.source,
            revokedAt: entry.revokedAt,
        })),
        total: count,
        page: params.page,
        pageSize: params.pageSize,
    };
};

/**
 * Download delivery (anti-piracy guard): the license is checked server-side
 * and only then is a short-lived signed CDN URL issued, bound to the user and
 * the specific build. The raw CDN location is never exposed.
 */
export const getDownload = async (
    userId: string,
    gameId: string,
    platform: Platform,
): Promise<{
    url: string;
    expiresAt: Date;
    version: string;
    checksumSha256: string;
    fileSizeBytes: number;
}> => {
    const entry = await LibraryEntryRepository.findActiveByUserAndGame(userId, gameId);
    if (!entry) throw AppError.forbidden("You do not own this game");

    const build = await GameBuildRepository.findActiveByGameAndPlatform(gameId, platform);
    if (!build) throw AppError.badRequest(`No active build for ${platform}`);

    const { url, expiresAt } = signCdnUrl(
        userId,
        build.id,
        `game-${gameId.slice(0, 8)}-${build.version}-${build.platform.toLowerCase()}.zip`,
    );

    return {
        url,
        expiresAt,
        version: build.version,
        checksumSha256: build.checksumSha256,
        fileSizeBytes: build.fileSizeBytes,
    };
};

export const grantLibraryEntry = async (
    userId: string,
    gameId: string,
    source: LibrarySource,
    orderItemId: string | null,
    transaction?: Transaction,
) =>
    LibraryEntryRepository.createIfAbsent(
        {
            userId,
            gameId,
            orderItemId,
            acquiredAt: new Date(),
            source,
        },
        transaction,
    );

export { commerceConfig };
