import { Op, QueryTypes, Transaction } from "sequelize";

import { Database } from "../config";
import PromotionGame from "../models/promotionGameModel";
import { IPromotionGameCreation } from "../interfaces/promotionGameInterface";

const { sequelize } = Database;

class PromotionGameRepository {
    static async create(
        data: IPromotionGameCreation,
        transaction?: Transaction,
    ): Promise<PromotionGame> {
        return PromotionGame.create(data, { transaction });
    }

    static async listByPromotion(promotionId: string): Promise<PromotionGame[]> {
        return PromotionGame.findAll({ where: { promotionId } });
    }

    static async deleteByPair(
        promotionId: string,
        gameId: string,
        transaction?: Transaction,
    ): Promise<number> {
        return PromotionGame.destroy({ where: { promotionId, gameId }, transaction });
    }

    static async deleteByPromotion(promotionId: string, transaction?: Transaction): Promise<number> {
        return PromotionGame.destroy({ where: { promotionId }, transaction });
    }

    /**
     * Overlap guard: promotions attached to `gameId` whose [startsAt, endsAt)
     * window intersects the given window. Blocked at attach time so the
     * pricing engine never has to arbitrate two promos on one game.
     */
    static async findOverlapping(
        gameId: string,
        startsAt: Date,
        endsAt: Date,
        exceptPromotionId?: string,
    ): Promise<PromotionGame[]> {
        const rows = await sequelize.query<{ id: string; promotion_id: string; game_id: string; discount_pct: number }>(
            `SELECT pg.* FROM promotion_games pg
             JOIN promotions pr ON pr.id = pg.promotion_id
             WHERE pg.game_id = :gameId
               AND pr.id <> COALESCE(:exceptId::uuid, '00000000-0000-0000-0000-000000000000'::uuid)
               AND pr.starts_at < :endsAt
               AND pr.ends_at > :startsAt
             LIMIT 5`,
            {
                replacements: {
                    gameId,
                    startsAt,
                    endsAt,
                    exceptId: exceptPromotionId ?? null,
                },
                type: QueryTypes.SELECT,
            },
        );

        return rows.map(
            (r) =>
                ({
                    id: r.id,
                    promotionId: r.promotion_id,
                    gameId: r.game_id,
                    discountPct: r.discount_pct,
                }) as unknown as PromotionGame,
        );
    }

    /**
     * Live-promotion coverage for the pricing engine. Promotions have no
     * status/soft-delete column: "live" IS the window (starts_at <= now <
     * ends_at; deletions are hard and cascade the link rows away), so those
     * two predicates are the complete liveness filter. Returns one row per
     * (game, live promotion) pair for every game covered by a live promotion
     * that touches at least one of `gameIds` — the full fan-out, so the
     * caller can tell a complete BUNDLE from a partial one. The caller
     * arbitrates the best discount per game. type/value let the caller
     * apportion FIXED/BUNDLE promotions by paisa instead of discount_pct.
     */
    static async findActiveForGames(
        gameIds: string[],
        now: Date = new Date(),
    ): Promise<
        Array<{ gameId: string; promotionId: string; discountPct: number; type: string; value: number }>
    > {
        if (gameIds.length === 0) return [];
        // Plain join: one row per (game, live promotion) pair; the caller
        // arbitrates the best discount per game in JS. The AS "camelCase"
        // aliases are load-bearing: raw SELECTs return snake_case keys, but
        // pricingServices reads row.gameId / row.promotionId / row.discountPct
        // (un-aliased they come back undefined and every discount silently
        // becomes zero).
        //
        // The fan-out matters: we return EVERY game of a live promotion that
        // covers at least one requested game, not just the requested games
        // themselves. pricingServices compares the full membership
        // (present.length !== promo.games.length) to decide whether a BUNDLE
        // is complete; filtering by game here would shrink promo.games to the
        // cart slice and let a 1-of-3 bundle claim the full fixed discount.
        // The PERCENT branch re-checks cart membership itself, so the extra
        // rows are harmless there.
        return sequelize.query<{
            gameId: string;
            promotionId: string;
            discountPct: number;
            type: string;
            value: number;
        }>(
            `SELECT pg.game_id AS "gameId",
                    pg.promotion_id AS "promotionId",
                    pg.discount_pct AS "discountPct",
                    pr.type, pr.value
             FROM promotion_games pg
             JOIN promotions pr ON pr.id = pg.promotion_id
             WHERE pr.starts_at <= :now
               AND pr.ends_at > :now
               AND pg.promotion_id IN (
                   SELECT DISTINCT pg2.promotion_id FROM promotion_games pg2
                   WHERE pg2.game_id = ANY(ARRAY[:gameIds]::uuid[])
               )`,
            { replacements: { gameIds, now }, type: QueryTypes.SELECT },
        );
    }
}

export default PromotionGameRepository;
