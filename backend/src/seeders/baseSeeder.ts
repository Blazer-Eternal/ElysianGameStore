import { Database } from "../config";
// Importing from the models index runs initModel + defineAssociations once.
import { Genre, Tag, TaxConfig } from "../models";
import { slugify } from "../utils/slugify";

// ---------------------------------------------------------------------------
// Reference data every other seeder (and the API) assumes to exist:
//   * genres + tags (admin-controlled M:N taxonomy for games)
//   * the VAT row — the pricing engine refuses to hard-code a rate; it reads
//     the latest tax_configs row with effective_from <= now (1300 bps = 13%).
//
// Note on "payment provider rows": the schema has no payment_providers table.
// Providers are enum-backed (ESEWA / KHALTI / CONNECTIPS / IMEPAY in
// paymentProviderEnum) and the runtime adapter mode lives in PAYMENT_PROVIDER_MODE
// (currently "mock"), so there is nothing to insert here.
//
// Everything is find-or-create by unique key (slug / name+effective_from) —
// safe to re-run forever.
// ---------------------------------------------------------------------------

const GENRE_NAMES = [
    "Action",
    "Adventure",
    "RPG",
    "Strategy",
    "Simulation",
    "Indie",
    "Puzzle",
    "Horror",
    "Racing",
    "Sports",
    "Casual",
    "Fighting",
];

const TAG_NAMES = [
    "Singleplayer",
    "Multiplayer",
    "Co-op",
    "Open World",
    "Story Rich",
    "Roguelike",
    "Pixel Art",
    "First-Person Shooter",
    "Turn-Based",
    "Survival",
    "Building",
    "Atmospheric",
    "Difficult",
    "Family Friendly",
    "Anime",
    "Sandbox",
    "Tower Defense",
    "Deckbuilder",
    "Metroidvania",
    "Comedy",
    "Parkour",
    "Mechs",
    "Hand-drawn",
    "VR",
    "Free to Play",
];

// Nepal VAT: 13% = 1300 basis points. Effective-dated — pricingServices picks
// the latest row whose effective_from <= now.
const VAT_RATE_BPS = 1300;
const VAT_EFFECTIVE_FROM = new Date("2026-01-01T00:00:00.000Z");

export const runBaseSeeder = async (): Promise<{ created: Record<string, number> }> => {
    await Database.sequelize.authenticate();

    let genresCreated = 0;
    for (const name of GENRE_NAMES) {
        const [, created] = await Genre.findOrCreate({
            where: { slug: slugify(name) },
            defaults: { name, slug: slugify(name) },
        });
        if (created) genresCreated += 1;
    }

    let tagsCreated = 0;
    for (const name of TAG_NAMES) {
        const [, created] = await Tag.findOrCreate({
            where: { slug: slugify(name) },
            defaults: { name, slug: slugify(name) },
        });
        if (created) tagsCreated += 1;
    }

    let taxCreated = 0;
    const [, taxInserted] = await TaxConfig.findOrCreate({
        where: { name: "VAT", effectiveFrom: VAT_EFFECTIVE_FROM },
        defaults: {
            name: "VAT",
            rateBps: VAT_RATE_BPS,
            effectiveFrom: VAT_EFFECTIVE_FROM,
        },
    });
    if (taxInserted) taxCreated += 1;

    return {
        created: { genres: genresCreated, tags: tagsCreated, taxConfigs: taxCreated },
    };
};

if (require.main === module) {
    runBaseSeeder()
        .then(({ created }) =>
            console.log(
                `Base data: genres +${created.genres}, tags +${created.tags}, tax configs +${created.taxConfigs}`,
            ),
        )
        .catch((error) => {
            console.error("Base seeding failed:", error);
            process.exitCode = 1;
        })
        .finally(() => Database.sequelize.close());
}
