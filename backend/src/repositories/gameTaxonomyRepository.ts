import { QueryTypes } from "sequelize";

import { Database } from "../config";

const { sequelize } = Database;

// M:N join-table access for game_genres / game_tags. Pure pivot tables, so
// raw SQL is used instead of dedicated models.
class GameTaxonomyRepository {
    static async setGenres(gameId: string, genreIds: string[], transaction?: unknown): Promise<void> {
        await sequelize.query(`DELETE FROM game_genres WHERE game_id = :gameId`, {
            replacements: { gameId },
            transaction: transaction as never,
        });
        for (const genreId of genreIds) {
            await sequelize.query(
                `INSERT INTO game_genres (game_id, genre_id) VALUES (:gameId, :genreId)
                 ON CONFLICT DO NOTHING`,
                { replacements: { gameId, genreId }, transaction: transaction as never },
            );
        }
    }

    static async setTags(gameId: string, tagIds: string[], transaction?: unknown): Promise<void> {
        await sequelize.query(`DELETE FROM game_tags WHERE game_id = :gameId`, {
            replacements: { gameId },
            transaction: transaction as never,
        });
        for (const tagId of tagIds) {
            await sequelize.query(
                `INSERT INTO game_tags (game_id, tag_id) VALUES (:gameId, :tagId)
                 ON CONFLICT DO NOTHING`,
                { replacements: { gameId, tagId }, transaction: transaction as never },
            );
        }
    }

    static async getGenreIds(gameId: string): Promise<string[]> {
        const rows = await sequelize.query<{ genre_id: string }>(
            `SELECT genre_id FROM game_genres WHERE game_id = :gameId`,
            { replacements: { gameId }, type: QueryTypes.SELECT },
        );
        return rows.map((r) => r.genre_id);
    }

    static async getTagIds(gameId: string): Promise<string[]> {
        const rows = await sequelize.query<{ tag_id: string }>(
            `SELECT tag_id FROM game_tags WHERE game_id = :gameId`,
            { replacements: { gameId }, type: QueryTypes.SELECT },
        );
        return rows.map((r) => r.tag_id);
    }
}

export default GameTaxonomyRepository;
