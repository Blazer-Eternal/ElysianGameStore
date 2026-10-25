import { faker } from "@faker-js/faker";

import { ModerationStatus } from "../../enums/moderationStatusEnum";
import { Database } from "../../config";
import { IReviewCreation } from "../../interfaces/reviewInterface";
// Importing from the models index runs initModel + defineAssociations once.
import { Game, Review, User } from "../../models";
import { FAKER_SEED, hashInt, seedUuid } from "../seedUtils";

const { sequelize } = Database;

// ---------------------------------------------------------------------------
// Reviews — Steam-style: recommend (required) plus an optional 1-5 rating and
// a free-text body. Only seeded for users who actually own the game (checked
// against library_entries, exactly like reviewServices does at write time),
// so every demo review is a genuine verified-owner review. playtime_minutes is
// summed from the seeded play_sessions so the "hours played" figure matches
// the session trail. A couple of rows exercise the moderation queue
// (PENDING / REJECTED) alongside the default APPROVED state.
//
// Idempotent via deterministic ids + unique (user_id, game_id).
// ---------------------------------------------------------------------------

interface DemoReview {
    user: string; // demo user key
    game: string; // game slug
    recommend: boolean;
    rating: number | null;
    body: string | null;
    moderation: ModerationStatus;
}

const REVIEWS: DemoReview[] = [
    { user: "aarav", game: "snow-leopard-chronicles", recommend: true, rating: 5, body: null, moderation: ModerationStatus.APPROVED },
    { user: "aarav", game: "kathmandu-drifter", recommend: true, rating: 4, body: null, moderation: ModerationStatus.APPROVED },
    { user: "aarav", game: "cyber-yeti", recommend: false, rating: 2, body: null, moderation: ModerationStatus.APPROVED },
    { user: "nisha", game: "neon-bazaar", recommend: true, rating: 4, body: null, moderation: ModerationStatus.APPROVED },
    { user: "nisha", game: "prayer-flags", recommend: true, rating: null, body: null, moderation: ModerationStatus.APPROVED },
    { user: "nisha", game: "yeti-siege", recommend: true, rating: 3, body: null, moderation: ModerationStatus.PENDING },
    { user: "kiran", game: "terminus-null", recommend: true, rating: 5, body: null, moderation: ModerationStatus.APPROVED },
];

export const runReviewSeeder = async (): Promise<{ created: Record<string, number> }> => {
    // Deterministic review text (same seed as the rest of the demo dataset).
    faker.seed(FAKER_SEED + 1);

    const users = await User.findAll({ attributes: ["id", "email"] });
    const userIdByKey = new Map(users.map((u) => [u.email.split("@")[0], u.id]));
    const games = await Game.findAll();
    const gameIdBySlug = new Map(games.map((g) => [g.slug, g.id]));

    let reviewsCreated = 0;

    for (const demo of REVIEWS) {
        const userId = userIdByKey.get(demo.user);
        const gameId = gameIdBySlug.get(demo.game);
        if (!userId) throw new Error(`Review author missing: ${demo.user} — run userSeeder first`);
        if (!gameId) throw new Error(`Review game missing: ${demo.game} — run gameSeeder first`);

        // Ownership gate: reviews are owner-only in this store.
        const [ownership] = (await sequelize.query(
            `SELECT 1 AS ok FROM library_entries
             WHERE user_id = :userId AND game_id = :gameId AND revoked_at IS NULL`,
            { replacements: { userId, gameId }, type: "SELECT" as never },
        )) as unknown as Array<{ ok: number }>;
        if (!ownership) {
            console.warn(`  skipping review ${demo.user} × ${demo.game}: no active library entry`);
            continue;
        }

        // Real playtime from the seeded session trail.
        const [sessionRow] = (await sequelize.query(
            `SELECT COALESCE(SUM(EXTRACT(EPOCH FROM (ended_at - started_at)) / 60), 0)::bigint AS minutes
             FROM play_sessions
             WHERE user_id = :userId AND game_id = :gameId AND ended_at IS NOT NULL`,
            { replacements: { userId, gameId }, type: "SELECT" as never },
        )) as unknown as Array<{ minutes: string }>;
        const playtimeMinutes = Number(sessionRow.minutes);

        const id = seedUuid(`review:${demo.user}:${demo.game}`);
        const [, created] = await Review.findOrCreate({
            where: { id },
            defaults: {
                id,
                userId,
                gameId,
                recommend: demo.recommend,
                rating: demo.rating,
                body: demo.body ?? faker.lorem.paragraph({ min: 1, max: 3 }),
                playtimeMinutes,
                helpfulCount: hashInt(`review-helpful:${demo.user}:${demo.game}`) % 25,
                moderationStatus: demo.moderation,
            } as IReviewCreation,
        });
        if (created) reviewsCreated += 1;
    }

    return { created: { reviews: reviewsCreated } };
};

if (require.main === module) {
    runReviewSeeder()
        .then(({ created }) => console.log(`Reviews: +${created.reviews}`))
        .catch((error) => {
            console.error("Review seeding failed:", error);
            process.exitCode = 1;
        });
}
