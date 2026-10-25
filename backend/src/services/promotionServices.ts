import { Database } from "../config";
import { FundedBy } from "../enums/fundedByEnum";
import { PromotionType } from "../enums/promotionTypeEnum";
import { NotificationType } from "../enums/notificationTypeEnum";
import { Role } from "../enums/roleEnum";
import { GameStatus } from "../enums/gameStatusEnum";
import Promotion from "../models/promotionModel";
import {
    GameRepository,
    PromotionGameRepository,
    PromotionRepository,
    PublisherRepository,
    WishlistRepository,
} from "../repositories";
import AppError from "../utils/appError";
import { audit, AUDIT_ACTIONS } from "./auditServices";
import { send } from "./notificationServices";

const { sequelize } = Database;

const toPublic = (p: Promotion) => ({
    id: p.id,
    name: p.name,
    type: p.type,
    value: p.value,
    startsAt: p.startsAt,
    endsAt: p.endsAt,
    fundedBy: p.fundedBy,
    createdBy: p.createdBy,
    notifiedAt: p.notifiedAt,
});

const assertWindow = (startsAt: Date, endsAt: Date): void => {
    if (new Date(endsAt) <= new Date(startsAt)) {
        throw AppError.badRequest("endsAt must be after startsAt");
    }
};

// PERCENT promotions carry a percent value (0 < value <= 90); FIXED and
// BUNDLE carry integer paisa off — BUNDLE behaves like FIXED but only when
// every covered game is in the cart (see pricingServices), and the seeder
// writes paisa there too, so validation must agree with both.
const assertValue = (type: PromotionType, value: number): void => {
    if (type === PromotionType.PERCENT) {
        if (value <= 0 || value > 90) {
            throw AppError.badRequest("Percent promotions must be between 1 and 90");
        }
    } else if (!Number.isInteger(value) || value <= 0) {
        throw AppError.badRequest("Fixed and bundle promotions must carry a positive paisa value");
    }
};

// ---------------------------------------------------------------------------
// Create. Admins may create STORE- or PUBLISHER-funded promotions; publishers
// only PUBLISHER-funded ones (attached later to their own games only).
// ---------------------------------------------------------------------------
export const create = async (
    actor: { id: string; role: Role },
    body: {
        name: string;
        type: PromotionType;
        value: number;
        startsAt: Date;
        endsAt: Date;
        fundedBy?: FundedBy;
    },
    ip?: string,
) => {
    assertWindow(body.startsAt, body.endsAt);
    assertValue(body.type, body.value);

    const fundedBy = body.fundedBy ?? FundedBy.STORE;
    if (actor.role !== Role.ADMIN && fundedBy !== FundedBy.PUBLISHER) {
        throw AppError.forbidden("Publishers can only create publisher-funded promotions");
    }

    const promotion = await PromotionRepository.create({
        name: body.name,
        type: body.type,
        value: body.value,
        startsAt: body.startsAt,
        endsAt: body.endsAt,
        fundedBy,
        createdBy: actor.id,
        notifiedAt: null,
    });

    await audit({
        actorId: actor.id,
        action: AUDIT_ACTIONS.PROMOTION_CREATED,
        entity: "promotion",
        entityId: promotion.id,
        diff: { name: body.name, type: body.type, value: body.value },
        ip,
    });
    return toPublic(promotion);
};

export const update = async (
    promotionId: string,
    actor: { id: string; role: Role },
    body: Partial<{ name: string; startsAt: Date; endsAt: Date }>,
) => {
    const promotion = await PromotionRepository.findById(promotionId);
    if (!promotion) throw AppError.notFound("Promotion not found");
    if (actor.role !== Role.ADMIN && promotion.createdBy !== actor.id) {
        throw AppError.notFound("Promotion not found");
    }
    const startsAt = body.startsAt ?? promotion.startsAt;
    const endsAt = body.endsAt ?? promotion.endsAt;
    assertWindow(startsAt, endsAt);
    await PromotionRepository.updateById(promotionId, { startsAt, endsAt, name: body.name });
    return PromotionRepository.findById(promotionId);
};

export const remove = async (promotionId: string, actor: { id: string; role: Role }, ip?: string) => {
    const promotion = await PromotionRepository.findById(promotionId);
    if (!promotion) throw AppError.notFound("Promotion not found");
    if (actor.role !== Role.ADMIN && promotion.createdBy !== actor.id) {
        throw AppError.notFound("Promotion not found");
    }
    await PromotionGameRepository.deleteByPromotion(promotionId);
    await PromotionRepository.deleteById(promotionId);
    await audit({
        actorId: actor.id,
        action: AUDIT_ACTIONS.PROMOTION_DELETED,
        entity: "promotion",
        entityId: promotionId,
        ip,
    });
};

// ---------------------------------------------------------------------------
// Attaching games — with the overlap guard: a game may never sit in two
// promotions whose windows intersect (checked here, so the pricing engine
// never has to arbitrate).
// ---------------------------------------------------------------------------
export const attachGame = async (
    promotionId: string,
    actor: { id: string; role: Role },
    gameId: string,
    discountPct?: number,
) => {
    const promotion = await PromotionRepository.findById(promotionId);
    if (!promotion) throw AppError.notFound("Promotion not found");
    if (actor.role !== Role.ADMIN && promotion.createdBy !== actor.id) {
        throw AppError.notFound("Promotion not found");
    }

    const game = await GameRepository.findById(gameId);
    if (!game) throw AppError.notFound("Game not found");
    if (game.status !== GameStatus.PUBLISHED) {
        throw AppError.badRequest("Only published games can be promoted");
    }
    if (actor.role !== Role.ADMIN) {
        const publisher = await PublisherRepository.findByOwnerUserId(actor.id);
        if (!publisher || publisher.id !== game.publisherId) {
            throw AppError.forbidden("You can only promote your own games");
        }
    }

    // discount_pct is only consumed by PERCENT promotions; FIXED/BUNDLE
    // promotions apportion their paisa value across the covered games in the
    // pricing engine (see computePromotionDiscounts), so their default row
    // value is a harmless 1 (never the paisa `value`, which would fail the
    // 1..90 pct range below).
    const pct =
        discountPct ??
        (promotion.type === PromotionType.PERCENT ? promotion.value : 1);
    if (pct < 1 || pct > 90) {
        throw AppError.badRequest("discountPct must be between 1 and 90");
    }

    const overlapping = await PromotionGameRepository.findOverlapping(
        gameId,
        promotion.startsAt,
        promotion.endsAt,
        promotionId,
    );
    if (overlapping.length > 0) {
        throw AppError.conflict(
            "This game already has a promotion whose window overlaps with this one",
        );
    }

    await PromotionGameRepository.create({ promotionId, gameId, discountPct: pct });
    return PromotionGameRepository.listByPromotion(promotionId);
};

export const detachGame = async (
    promotionId: string,
    actor: { id: string; role: Role },
    gameId: string,
) => {
    const promotion = await PromotionRepository.findById(promotionId);
    if (!promotion) throw AppError.notFound("Promotion not found");
    if (actor.role !== Role.ADMIN && promotion.createdBy !== actor.id) {
        throw AppError.notFound("Promotion not found");
    }
    const removed = await PromotionGameRepository.deleteByPair(promotionId, gameId);
    if (removed === 0) throw AppError.notFound("Game is not part of this promotion");
    return PromotionGameRepository.listByPromotion(promotionId);
};

export const listForActor = async (actor: { id: string; role: Role }) => {
    const promotions =
        actor.role === Role.ADMIN
            ? await PromotionRepository.listAll()
            : await PromotionRepository.listByCreator(actor.id);
    const withGames = await Promise.all(
        promotions.map(async (p) => ({
            ...toPublic(p),
            games: await PromotionGameRepository.listByPromotion(p.id),
        })),
    );
    return withGames;
};

export const listPublicActive = async () => {
    const now = new Date();
    const all = await PromotionRepository.listAll();
    return all
        .filter((p) => p.startsAt <= now && p.endsAt > now)
        .map(toPublic);
};

// ---------------------------------------------------------------------------
// Spec logic #6 — wishlist-driven sale notifications. When a promotion goes
// live, every user who wishlisted a covered game gets a PROMOTION
// notification; a later purchase stamps converted_at for conversion stats.
// The sweep runs from the in-process scheduler (see maintenanceServices).
// ---------------------------------------------------------------------------
export const sweepStartingPromotions = async (): Promise<number> => {
    const live = await PromotionRepository.listLiveUnnotified();
    let processed = 0;

    for (const promotion of live) {
        const promotionGames = await PromotionGameRepository.listByPromotion(promotion.id);
        const gameIds = promotionGames.map((pg) => pg.gameId);
        if (gameIds.length > 0) {
            const wishers = await WishlistRepository.listUserIdsByGames(gameIds);
            for (const w of wishers) {
                await send(
                    w.userId,
                    NotificationType.PROMOTION,
                    `Sale: ${promotion.name}`,
                    `A game on your wishlist is now on sale (${promotion.type === PromotionType.PERCENT ? `${promotion.value}% off` : "special price"}).`,
                    { promotionId: promotion.id, gameId: w.gameId },
                );
            }
        }
        // notifiedAt makes the fan-out exactly-once.
        await PromotionRepository.updateById(promotion.id, { notifiedAt: new Date() });
        processed += 1;
    }
    return processed;
};

void sequelize;
