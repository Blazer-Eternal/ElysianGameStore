import { QueryTypes, Transaction } from "sequelize";

import { Database } from "../config";
import Review from "../models/reviewModel";
import User from "../models/userModel";
import { IReview, IReviewCreation } from "../interfaces/reviewInterface";

const { sequelize } = Database;

class ReviewRepository {
    static async create(data: IReviewCreation, transaction?: Transaction): Promise<Review> {
        return Review.create(data, { transaction });
    }

    static async findById(id: string): Promise<Review | null> {
        return Review.findByPk(id);
    }

    static async findByUserAndGame(
        userId: string,
        gameId: string,
        transaction?: Transaction,
    ): Promise<Review | null> {
        return Review.findOne({ where: { userId, gameId }, transaction });
    }

    static async listByGame(
        gameId: string,
        params: {
            sort?: "recent" | "helpful" | "positive" | "negative";
            limit: number;
            offset: number;
            moderationStatus?: string;
        },
    ): Promise<{ rows: Review[]; count: number }> {
        const where: Record<string, unknown> = {
            gameId,
            moderationStatus: params.moderationStatus ?? "APPROVED",
        };
        const orderMap: Record<string, Array<[string, string]>> = {
            recent: [["created_at", "DESC"]],
            helpful: [["helpful_count", "DESC"]],
            positive: [["recommend", "DESC"], ["created_at", "DESC"]],
            negative: [["recommend", "ASC"], ["created_at", "DESC"]],
        };
        return Review.findAndCountAll({
            where,
            include: [{ model: User, as: "user", attributes: ["id", "username"] }],
            limit: params.limit,
            offset: params.offset,
            order: orderMap[params.sort ?? "recent"] ?? orderMap.recent,
            distinct: true,
        });
    }

    static async updateById(
        id: string,
        fields: Partial<IReview>,
        transaction?: Transaction,
    ): Promise<[number]> {
        return Review.update(fields, { where: { id }, transaction });
    }

    static async deleteById(id: string, transaction?: Transaction): Promise<number> {
        return Review.destroy({ where: { id }, transaction });
    }

    /**
     * Records a helpful vote idempotently: the (review, user) row in
     * review_helpful_votes is the gate — the counter only moves when this
     * insert actually created a row, so repeat calls can never inflate it.
     * Returns true when the vote was newly recorded.
     */
    static async recordHelpfulVote(reviewId: string, userId: string): Promise<boolean> {
        return sequelize.transaction(async (t) => {
            // RETURNING turns the insert into a row-returning statement: one
            // row back = the vote was new, zero rows back = ON CONFLICT skipped
            // it (this user already voted). The counter moves only in the
            // first case, inside the same transaction.
            const rows = await sequelize.query<{ review_id: string }>(
                `INSERT INTO review_helpful_votes (review_id, user_id) VALUES (:reviewId, :userId)
                 ON CONFLICT (review_id, user_id) DO NOTHING
                 RETURNING review_id`,
                { replacements: { reviewId, userId }, transaction: t, type: QueryTypes.SELECT },
            );
            if (rows.length === 0) return false;
            await Review.increment("helpfulCount", { by: 1, where: { id: reviewId }, transaction: t });
            return true;
        });
    }
}

export default ReviewRepository;
