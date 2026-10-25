import { Op, QueryTypes, Transaction } from "sequelize";

import { Database } from "../config";
import Game from "../models/gameModel";
import Genre from "../models/genreModel";
import Publisher from "../models/publisherModel";
import SystemRequirement from "../models/systemRequirementModel";
import Tag from "../models/tagModel";
import { IGame, IGameCreation } from "../interfaces/gameInterface";

const { sequelize } = Database;

export interface GameSearchFilters {
    q?: string;
    genreSlug?: string;
    tagSlug?: string;
    priceMinPaisa?: number;
    priceMaxPaisa?: number;
    minRecommendRatio?: number;
    releaseFrom?: string;
    releaseTo?: string;
    publisherId?: string;
    isEarlyAccess?: boolean;
    sort?: "relevance" | "newest" | "price_asc" | "price_desc" | "top_rated" | "trending";
    limit: number;
    offset: number;
}

export interface GameSearchRow {
    id: string;
    title: string;
    slug: string;
    short_desc: string;
    age_rating: string;
    base_price_paisa: number;
    status: string;
    release_date: Date | null;
    is_early_access: boolean;
    publisher_name: string;
    cover_url: string | null;
    review_count: number;
    recommend_count: number;
    recommend_ratio: number | null;
    wishlist_count: number;
    sales_14d: number;
}

class GameRepository {
    static async create(data: IGameCreation, transaction?: Transaction): Promise<Game> {
        return Game.create(data, { transaction });
    }

    static async findById(id: string): Promise<Game | null> {
        return Game.findByPk(id);
    }

    static async findBySlug(slug: string): Promise<Game | null> {
        return Game.findOne({ where: { slug } });
    }

    static async slugExists(slug: string): Promise<boolean> {
        const count = await Game.count({ where: { slug } });
        return count > 0;
    }

    static async updateById(
        id: string,
        fields: Partial<IGame>,
        transaction?: Transaction,
    ): Promise<[number]> {
        return Game.update(fields, { where: { id }, transaction });
    }

    static async listForPublisher(
        publisherId: string,
        params: { status?: string; limit: number; offset: number },
    ): Promise<{ rows: Game[]; count: number }> {
        const where: Record<string, unknown> = { publisherId };
        if (params.status) where.status = params.status;
        return Game.findAndCountAll({
            where,
            limit: params.limit,
            offset: params.offset,
            order: [["updated_at", "DESC"]],
        });
    }

    // The public browse & search query: Postgres full-text search over the
    // generated search_vector, genre/tag filters, NPR price band, release
    // date window and two ranking modes —
    //   top_rated: recommend ratio weighted by review volume
    //   trending:  recent sales (60%) + wishlist velocity (40%)
    static async search(filters: GameSearchFilters): Promise<{ rows: GameSearchRow[]; count: number }> {
        const replacements: Record<string, unknown> = {
            limit: filters.limit,
            offset: filters.offset,
            priceMin: filters.priceMinPaisa ?? null,
            priceMax: filters.priceMaxPaisa ?? null,
            minRatio: filters.minRecommendRatio ?? null,
            genreSlug: filters.genreSlug ?? null,
            tagSlug: filters.tagSlug ?? null,
            publisherId: filters.publisherId ?? null,
            q: filters.q ?? null,
            releaseFrom: filters.releaseFrom ?? null,
            releaseTo: filters.releaseTo ?? null,
        };

        const where: string[] = [`g.status = 'PUBLISHED'`];
        if (filters.publisherId) where.push(`g.publisher_id = :publisherId`);
        if (filters.q) where.push(`g.search_vector @@ plainto_tsquery('english', :q)`);
        if (filters.genreSlug)
            where.push(`EXISTS (
                SELECT 1 FROM game_genres gg JOIN genres gen ON gen.id = gg.genre_id
                WHERE gg.game_id = g.id AND gen.slug = :genreSlug)`);
        if (filters.tagSlug)
            where.push(`EXISTS (
                SELECT 1 FROM game_tags gt JOIN tags t2 ON t2.id = gt.tag_id
                WHERE gt.game_id = g.id AND t2.slug = :tagSlug)`);
        if (filters.priceMinPaisa != null) where.push(`g.base_price_paisa >= :priceMin`);
        if (filters.priceMaxPaisa != null) where.push(`g.base_price_paisa <= :priceMax`);
        if (filters.releaseFrom) where.push(`g.release_date >= :releaseFrom::date`);
        if (filters.releaseTo) where.push(`g.release_date <= :releaseTo::date`);
        if (filters.minRecommendRatio != null)
            where.push(`(COALESCE(r.recommend_count, 0)::float / NULLIF(r.review_count, 0)) >= :minRatio`);

        const orderMap: Record<string, string> = {
            relevance: `ts_rank(g.search_vector, plainto_tsquery('english', coalesce(:q, ''))) DESC, g.title ASC`,
            newest: `g.published_at DESC NULLS LAST, g.created_at DESC`,
            price_asc: `g.base_price_paisa ASC`,
            price_desc: `g.base_price_paisa DESC`,
            top_rated: `(COALESCE(r.recommend_count, 0)::float / NULLIF(r.review_count, 0)) * ln(1 + COALESCE(r.review_count, 0)) DESC NULLS LAST, g.published_at DESC`,
            trending: `(COALESCE(s.sales_14d, 0) * 0.6 + COALESCE(w.wishlist_count, 0) * 0.4) DESC, g.published_at DESC`,
        };
        const orderBy = orderMap[filters.sort ?? "newest"] ?? orderMap.newest;

        const from = `
            FROM games g
            JOIN publishers p ON p.id = g.publisher_id
            LEFT JOIN LATERAL (
                SELECT m.url FROM game_media m
                WHERE m.game_id = g.id AND m.type = 'COVER'
                LIMIT 1
            ) cover ON true
            LEFT JOIN (
                SELECT game_id,
                       COUNT(*)::int AS review_count,
                       COUNT(*) FILTER (WHERE recommend)::int AS recommend_count
                FROM reviews WHERE moderation_status = 'APPROVED'
                GROUP BY game_id
            ) r ON r.game_id = g.id
            LEFT JOIN (
                SELECT game_id, COUNT(*)::int AS wishlist_count
                FROM wishlists GROUP BY game_id
            ) w ON w.game_id = g.id
            LEFT JOIN (
                SELECT oi.game_id, COUNT(*)::int AS sales_14d
                FROM order_items oi
                JOIN orders o ON o.id = oi.order_id
                WHERE o.status IN ('PAID', 'PARTIAL_REFUND', 'REFUNDED')
                  AND o.paid_at > NOW() - INTERVAL '14 days'
                GROUP BY oi.game_id
            ) s ON s.game_id = g.id`;

        const countRows = await sequelize.query<{ total: number }>(
            `SELECT COUNT(*)::int AS total ${from} WHERE ${where.join(" AND ")}`,
            { replacements, type: QueryTypes.SELECT },
        );

        const rows = await sequelize.query<GameSearchRow>(
            `SELECT g.id, g.title, g.slug, g.short_desc, g.age_rating, g.base_price_paisa,
                    g.status, g.release_date, g.is_early_access,
                    p.name AS publisher_name,
                    cover.url AS cover_url,
                    COALESCE(r.review_count, 0) AS review_count,
                    COALESCE(r.recommend_count, 0) AS recommend_count,
                    (COALESCE(r.recommend_count, 0)::float / NULLIF(r.review_count, 0)) AS recommend_ratio,
                    COALESCE(w.wishlist_count, 0) AS wishlist_count,
                    COALESCE(s.sales_14d, 0) AS sales_14d
             ${from}
             WHERE ${where.join(" AND ")}
             ORDER BY ${orderBy}
             LIMIT :limit OFFSET :offset`,
            { replacements, type: QueryTypes.SELECT },
        );

        return { rows, count: countRows[0]?.total ?? 0 };
    }

    /**
     * Pricing-engine input: the games plus the publisher's snapshottable
     * revenue share and (optionally) the buyer's birth date for the age gate.
     */
    static async searchByIdsForQuote(
        gameIds: string[],
        userId?: string,
    ): Promise<
        Array<{
            id: string;
            title: string;
            slug: string;
            ageRating: IGame["ageRating"];
            basePricePaisa: number;
            status: string;
            publisherId: string;
            revenueSharePct: number;
            userBirthDate: Date | null;
        }>
    > {
        const rows = await sequelize.query<{
            id: string;
            title: string;
            slug: string;
            age_rating: string;
            base_price_paisa: number;
            status: string;
            publisher_id: string;
            revenue_share_pct: number;
            user_birth_date: Date | null;
        }>(
            `SELECT g.id, g.title, g.slug, g.age_rating, g.base_price_paisa, g.status,
                    g.publisher_id, p.revenue_share_pct, u.birth_date AS user_birth_date
             FROM games g
             JOIN publishers p ON p.id = g.publisher_id
             LEFT JOIN users u ON u.id = :userId
             WHERE g.id = ANY(ARRAY[:gameIds]::uuid[])`,
            { replacements: { gameIds, userId: userId ?? null }, type: QueryTypes.SELECT },
        );
        return rows.map((r) => ({
            id: r.id,
            title: r.title,
            slug: r.slug,
            ageRating: r.age_rating as IGame["ageRating"],
            basePricePaisa: Number(r.base_price_paisa),
            status: r.status,
            publisherId: r.publisher_id,
            revenueSharePct: Number(r.revenue_share_pct),
            userBirthDate: r.user_birth_date,
        }));
    }

    static async findDetailBySlug(slug: string): Promise<{
        game: Game;
        publisher: Publisher | null;
        genres: Genre[];
        tags: Tag[];
        requirements: SystemRequirement[];
    } | null> {
        const game = await Game.findOne({
            where: { slug },
            include: [
                { model: Publisher, as: "publisher" },
                { model: Genre, as: "genres", through: { attributes: [] } },
                { model: Tag, as: "tags", through: { attributes: [] } },
                { model: SystemRequirement, as: "systemRequirements" },
            ],
        });
        if (!game) return null;
        const typed = game as unknown as {
            publisher: Publisher;
            genres: Genre[];
            tags: Tag[];
            systemRequirements: SystemRequirement[];
        };
        return {
            game,
            publisher: typed.publisher ?? null,
            genres: typed.genres ?? [],
            tags: typed.tags ?? [],
            requirements: typed.systemRequirements ?? [],
        };
    }
}

export default GameRepository;
