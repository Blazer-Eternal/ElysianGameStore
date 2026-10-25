import { Database } from "../config";
import { ModerationStatus } from "../enums/moderationStatusEnum";
import { Role } from "../enums/roleEnum";
import Review from "../models/reviewModel";
import {
    GameRepository,
    LibraryEntryRepository,
    PlaySessionRepository,
    ReviewRepository,
} from "../repositories";
import AppError from "../utils/appError";
import { audit, AUDIT_ACTIONS } from "./auditServices";

const { sequelize } = Database;

// ---------------------------------------------------------------------------
// Verified-owner reviews (spec logic #7): only users with an active library
// entry may review; playtime is snapshotted from PlaySessions; the recommend
// ratio feeds "Top Rated" ranking in GameRepository.search.
// ---------------------------------------------------------------------------
export const listByGame = async (
    gameId: string,
    params: { sort?: "recent" | "helpful" | "positive" | "negative"; page: number; pageSize: number },
) => {
    const { rows, count } = await ReviewRepository.listByGame(gameId, {
        sort: params.sort,
        limit: params.pageSize,
        offset: (params.page - 1) * params.pageSize,
    });
    return {
        reviews: rows.map((r) => {
            // toJSON() yields a plain row object, not the model instance.
            const json = r.toJSON() as unknown as Record<string, unknown>;
            const user = json.user as { id: string; username: string } | undefined;
            return { ...json, user: user ? { id: user.id, username: user.username } : undefined };
        }),
        total: count,
        page: params.page,
        pageSize: params.pageSize,
    };
};

export const create = async (
    userId: string,
    input: { gameId: string; recommend: boolean; rating?: number; body?: string },
    ip?: string,
) => {
    const game = await GameRepository.findById(input.gameId);
    if (!game) throw AppError.notFound("Game not found");

    // Owners only — checked against the live library entry.
    const entry = await LibraryEntryRepository.findActiveByUserAndGame(userId, input.gameId);
    if (!entry) throw AppError.forbidden("Only owners of a game can review it");

    if (await ReviewRepository.findByUserAndGame(userId, input.gameId)) {
        throw AppError.conflict("You already reviewed this game — update your review instead");
    }
    if (input.rating !== undefined && (input.rating < 1 || input.rating > 5)) {
        throw AppError.badRequest("rating must be between 1 and 5");
    }

    const playtimeMinutes = await PlaySessionRepository.sumMinutes(userId, input.gameId);

    const review = await ReviewRepository.create({
        userId,
        gameId: input.gameId,
        recommend: input.recommend,
        rating: input.rating ?? null,
        body: input.body ?? null,
        playtimeMinutes,
        helpfulCount: 0,
        moderationStatus: ModerationStatus.APPROVED, // ownership already verified
    });

    void ip;
    return review;
};

export const update = async (
    userId: string,
    reviewId: string,
    input: { recommend?: boolean; rating?: number; body?: string },
) => {
    const review = await ReviewRepository.findById(reviewId);
    if (!review || review.userId !== userId) throw AppError.notFound("Review not found");

    const playtimeMinutes = await PlaySessionRepository.sumMinutes(userId, review.gameId);
    const fields: Record<string, unknown> = {};
    if (input.recommend !== undefined) fields.recommend = input.recommend;
    if (input.rating !== undefined) {
        if (input.rating < 1 || input.rating > 5) {
            throw AppError.badRequest("rating must be between 1 and 5");
        }
        fields.rating = input.rating;
    }
    if (input.body !== undefined) fields.body = input.body;
    fields.playtimeMinutes = playtimeMinutes; // keep the snapshot current

    await ReviewRepository.updateById(reviewId, fields);
    return ReviewRepository.findById(reviewId);
};

export const remove = async (userId: string, reviewId: string) => {
    const review = await ReviewRepository.findById(reviewId);
    if (!review || review.userId !== userId) throw AppError.notFound("Review not found");
    await ReviewRepository.deleteById(reviewId);
};

// One vote per (review, user): the vote row in review_helpful_votes is the
// gate, so re-hitting the endpoint can never inflate the counter.
export const markHelpful = async (userId: string, reviewId: string) => {
    const review = await ReviewRepository.findById(reviewId);
    if (!review) throw AppError.notFound("Review not found");
    const recorded = await ReviewRepository.recordHelpfulVote(reviewId, userId);
    if (!recorded) throw AppError.conflict("You already marked this review as helpful");
    return ReviewRepository.findById(reviewId);
};

// Staff moderation: hide a review (REJECTED) or restore it.
export const moderate = async (
    reviewId: string,
    adminId: string,
    moderationStatus: ModerationStatus,
    ip?: string,
) => {
    const review = await ReviewRepository.findById(reviewId);
    if (!review) throw AppError.notFound("Review not found");
    await ReviewRepository.updateById(reviewId, { moderationStatus });
    await audit({
        actorId: adminId,
        action: AUDIT_ACTIONS.REVIEW_MODERATED,
        entity: "review",
        entityId: reviewId,
        diff: { from: review.moderationStatus, to: moderationStatus },
        ip,
    });
    return ReviewRepository.findById(reviewId);
};

export { sequelize, Role };
