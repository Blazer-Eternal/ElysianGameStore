import { faker } from "@faker-js/faker";

import { AgeRating } from "../../enums/ageRatingEnum";
import { GameStatus } from "../../enums/gameStatusEnum";
import { MediaType } from "../../enums/mediaTypeEnum";
import { Platform } from "../../enums/platformEnum";
import { SystemRequirementType } from "../../enums/systemRequirementTypeEnum";
import { GameKeyStatus } from "../../enums/gameKeyStatusEnum";
import { Database } from "../../config";
import { IGameMediaCreation } from "../../interfaces/gameMediaInterface";
// Importing from the models index runs initModel + defineAssociations once.
import {
    Game,
    GameBuild,
    GameKey,
    GameMedia,
    Genre,
    Publisher,
    SystemRequirement,
    Tag,
    User,
} from "../../models";
import { slugify } from "../../utils/slugify";
import { toPaisa } from "../../utils/money";
import { FAKER_SEED, hashInt, insertedCount, seedUuid, sha256Hex } from "../seedUtils";

const { sequelize } = Database;

// ---------------------------------------------------------------------------
// 21 demo games spread over both demo publishers. Prices are integer paisa
// (toPaisa at the definition site, so no float ever reaches the DB). Each
// published game gets the full publishable package — one active build, one
// cover, 3 screenshots, a trailer and MIN + REC requirement rows — mirroring
// what gameServices.assertPublishable demands, plus a handful of redeemable
// game keys on the two flagship titles.
//
// Long descriptions/changelog text is faker-generated AFTER faker.seed(12345),
// so the dataset is byte-identical on every run. All upserts hang off unique
// keys: games by slug, links by composite key (ON CONFLICT DO NOTHING), media
// and keys by deterministic ids/hashes.
// ---------------------------------------------------------------------------

interface DemoGame {
    slug: string;
    title: string;
    publisher: string; // demo user key of the publisher owner
    priceRs: number; // rupees — converted once, stored as paisa
    ageRating: AgeRating;
    status: GameStatus;
    earlyAccess: boolean;
    genres: string[];
    tags: string[];
    releaseDaysAgo: number;
    sizeGb: number;
}

export const GAMES: DemoGame[] = [
    // ---- Himalaya Studio (NPR) ----
    { slug: "snow-leopard-chronicles", title: "Snow Leopard Chronicles", publisher: "himalaya.studio", priceRs: 2499, ageRating: AgeRating.T, status: GameStatus.PUBLISHED, earlyAccess: false, genres: ["Adventure", "RPG"], tags: ["Open World", "Story Rich", "Singleplayer"], releaseDaysAgo: 210, sizeGb: 42 },
    { slug: "kathmandu-drifter", title: "Kathmandu Drifter", publisher: "himalaya.studio", priceRs: 1499, ageRating: AgeRating.T, status: GameStatus.PUBLISHED, earlyAccess: false, genres: ["Racing", "Indie"], tags: ["Singleplayer", "Atmospheric"], releaseDaysAgo: 150, sizeGb: 18 },
    { slug: "yeti-siege", title: "Yeti Siege", publisher: "himalaya.studio", priceRs: 1999, ageRating: AgeRating.M, status: GameStatus.PUBLISHED, earlyAccess: false, genres: ["Action", "Strategy"], tags: ["Turn-Based", "Mechs", "Difficult"], releaseDaysAgo: 95, sizeGb: 26 },
    { slug: "prayer-flags", title: "Prayer Flags", publisher: "himalaya.studio", priceRs: 699, ageRating: AgeRating.E, status: GameStatus.PUBLISHED, earlyAccess: false, genres: ["Puzzle", "Indie"], tags: ["Hand-drawn", "Atmospheric", "Family Friendly"], releaseDaysAgo: 300, sizeGb: 4 },
    { slug: "monsoon-mayhem", title: "Monsoon Mayhem", publisher: "himalaya.studio", priceRs: 999, ageRating: AgeRating.E, status: GameStatus.PUBLISHED, earlyAccess: false, genres: ["Casual", "Indie"], tags: ["Co-op", "Comedy", "Family Friendly"], releaseDaysAgo: 60, sizeGb: 7 },
    { slug: "himalayan-heights", title: "Himalayan Heights", publisher: "himalaya.studio", priceRs: 1299, ageRating: AgeRating.T, status: GameStatus.PUBLISHED, earlyAccess: false, genres: ["Simulation", "Strategy"], tags: ["Building", "Singleplayer"], releaseDaysAgo: 40, sizeGb: 11 },
    { slug: "ghost-street-kathmandu", title: "Ghost Street Kathmandu", publisher: "himalaya.studio", priceRs: 1199, ageRating: AgeRating.M, status: GameStatus.PUBLISHED, earlyAccess: false, genres: ["Horror", "Adventure"], tags: ["Atmospheric", "Difficult", "Story Rich"], releaseDaysAgo: 25, sizeGb: 23 },
    { slug: "rickshaw-rumble", title: "Rickshaw Rumble", publisher: "himalaya.studio", priceRs: 499, ageRating: AgeRating.E, status: GameStatus.PUBLISHED, earlyAccess: false, genres: ["Fighting", "Casual"], tags: ["Multiplayer", "Comedy"], releaseDaysAgo: 130, sizeGb: 6 },
    { slug: "everest-base-camp-tycoon", title: "Everest Base Camp Tycoon", publisher: "himalaya.studio", priceRs: 1599, ageRating: AgeRating.E, status: GameStatus.PUBLISHED, earlyAccess: false, genres: ["Simulation"], tags: ["Building", "Singleplayer"], releaseDaysAgo: 15, sizeGb: 9 },
    { slug: "terminus-null", title: "Terminus Null", publisher: "himalaya.studio", priceRs: 1899, ageRating: AgeRating.T, status: GameStatus.PUBLISHED, earlyAccess: false, genres: ["Action", "Adventure"], tags: ["First-Person Shooter", "Co-op", "Survival"], releaseDaysAgo: 5, sizeGb: 55 },
    { slug: "lantern-of-manaslu", title: "Lantern of Manaslu", publisher: "himalaya.studio", priceRs: 0, ageRating: AgeRating.E, status: GameStatus.PUBLISHED, earlyAccess: false, genres: ["Indie", "Puzzle"], tags: ["Free to Play", "Atmospheric", "Singleplayer"], releaseDaysAgo: 45, sizeGb: 3 },
    { slug: "summit-siege-legends", title: "Summit Siege: Legends", publisher: "himalaya.studio", priceRs: 2999, ageRating: AgeRating.M, status: GameStatus.PUBLISHED, earlyAccess: true, genres: ["Strategy", "RPG"], tags: ["Turn-Based", "Roguelike", "Difficult"], releaseDaysAgo: 2, sizeGb: 31 },

    // ---- Yeti Works (USD payouts) ----
    { slug: "neon-bazaar", title: "Neon Bazaar", publisher: "yeti.works", priceRs: 1399, ageRating: AgeRating.T, status: GameStatus.PUBLISHED, earlyAccess: false, genres: ["RPG", "Indie"], tags: ["Pixel Art", "Story Rich", "Singleplayer"], releaseDaysAgo: 180, sizeGb: 14 },
    { slug: "cyber-yeti", title: "Cyber Yeti", publisher: "yeti.works", priceRs: 1799, ageRating: AgeRating.M, status: GameStatus.PUBLISHED, earlyAccess: false, genres: ["Action"], tags: ["First-Person Shooter", "Difficult"], releaseDaysAgo: 120, sizeGb: 38 },
    { slug: "sherpa-ascending", title: "Sherpa Ascending", publisher: "yeti.works", priceRs: 899, ageRating: AgeRating.E, status: GameStatus.PUBLISHED, earlyAccess: false, genres: ["Adventure", "Indie"], tags: ["Parkour", "Singleplayer", "Family Friendly"], releaseDaysAgo: 88, sizeGb: 8 },
    { slug: "dharma-defenders", title: "Dharma Defenders", publisher: "yeti.works", priceRs: 1099, ageRating: AgeRating.E, status: GameStatus.PUBLISHED, earlyAccess: false, genres: ["Strategy", "Simulation"], tags: ["Tower Defense", "Singleplayer"], releaseDaysAgo: 70, sizeGb: 10 },
    { slug: "midnight-mandala", title: "Midnight Mandala", publisher: "yeti.works", priceRs: 799, ageRating: AgeRating.T, status: GameStatus.PUBLISHED, earlyAccess: false, genres: ["Puzzle", "Indie"], tags: ["Hand-drawn", "Atmospheric", "Story Rich"], releaseDaysAgo: 55, sizeGb: 5 },
    { slug: "raktaksha-protocol", title: "Raktaksha Protocol", publisher: "yeti.works", priceRs: 2199, ageRating: AgeRating.AO, status: GameStatus.PUBLISHED, earlyAccess: false, genres: ["Action", "RPG"], tags: ["Story Rich", "Difficult", "Singleplayer"], releaseDaysAgo: 20, sizeGb: 47 },
    { slug: "cloud-kingdoms", title: "Cloud Kingdoms", publisher: "yeti.works", priceRs: 1699, ageRating: AgeRating.T, status: GameStatus.PUBLISHED, earlyAccess: false, genres: ["RPG", "Strategy"], tags: ["Turn-Based", "Anime", "Multiplayer"], releaseDaysAgo: 10, sizeGb: 29 },

    // Lifecycle demos: not (yet) purchasable.
    { slug: "project-sagarmatha", title: "Project Sagarmatha", publisher: "yeti.works", priceRs: 2499, ageRating: AgeRating.T, status: GameStatus.IN_REVIEW, earlyAccess: false, genres: ["Adventure"], tags: ["Open World", "Story Rich"], releaseDaysAgo: -30, sizeGb: 40 },
    { slug: "high-pass-rally", title: "High Pass Rally", publisher: "himalaya.studio", priceRs: 1999, ageRating: AgeRating.E, status: GameStatus.DRAFT, earlyAccess: false, genres: ["Racing"], tags: ["Multiplayer", "Survival"], releaseDaysAgo: -60, sizeGb: 22 },
];

// One active WINDOWS build per game; a Linux build for a couple of them, and
// an older inactive build on the flagship so "version history" isn't empty.
const LINUX_BUILD_SLUGS = new Set(["snow-leopard-chronicles", "cyber-yeti", "terminus-null"]);
const LEGACY_BUILD_SLUGS = new Set(["snow-leopard-chronicles", "cyber-yeti"]);

const SPEC_TEMPLATES: Record<SystemRequirementType, { ramGb: number; storageFactor: number; directx: string }> = {
    [SystemRequirementType.MIN]: { ramGb: 8, storageFactor: 1, directx: "DirectX 12" },
    [SystemRequirementType.REC]: { ramGb: 16, storageFactor: 1.2, directx: "DirectX 12 Ultimate" },
};

const specFor = (type: SystemRequirementType, sizeGb: number) => {
    const t = SPEC_TEMPLATES[type];
    const min = type === SystemRequirementType.MIN;
    return {
        os: min ? "Windows 10 64-bit" : "Windows 11 64-bit",
        cpu: min ? "Intel Core i5-6600K / AMD Ryzen 3 1300X" : "Intel Core i7-12700K / AMD Ryzen 7 5800X",
        gpu: min ? "NVIDIA GTX 1060 6GB / AMD Radeon RX 580 8GB" : "NVIDIA RTX 3070 / AMD Radeon RX 6800",
        ramGb: t.ramGb,
        storageGb: Math.ceil(sizeGb * t.storageFactor),
        directx: t.directx,
    };
};

export const runGameSeeder = async (): Promise<{ created: Record<string, number> }> => {
    // Fixed seed → identical long descriptions / changelogs on every run.
    faker.seed(FAKER_SEED);

    const publishers = await Publisher.findAll();
    const owners = await User.findAll({ attributes: ["id", "email"] });
    const publisherIdByKey = new Map<string, string>();
    for (const p of publishers) {
        const owner = owners.find((u) => u.id === p.ownerUserId);
        if (!owner) continue;
        const key = owner.email.split("@")[0];
        publisherIdByKey.set(key, p.id);
    }

    const genres = await Genre.findAll();
    const tags = await Tag.findAll();
    const genreIdByName = new Map(genres.map((g) => [g.name, g.id]));
    const tagIdByName = new Map(tags.map((t) => [t.name, t.id]));

    let gamesCreated = 0;
    let linksCreated = 0;
    let buildsCreated = 0;
    let specsCreated = 0;
    let mediaCreated = 0;
    let keysCreated = 0;

    for (const demo of GAMES) {
        const publisherId = publisherIdByKey.get(demo.publisher);
        if (!publisherId) {
            throw new Error(`Demo publisher not found: ${demo.publisher} — run userSeeder first`);
        }

        const longDesc = `${faker.lorem.paragraph({ min: 3, max: 6 })} ${faker.lorem.paragraph({ min: 2, max: 4 })}`;
        const [game, gameCreated] = await Game.findOrCreate({
            where: { slug: demo.slug },
            defaults: {
                publisherId,
                title: demo.title,
                slug: demo.slug,
                shortDesc: faker.lorem.sentence({ min: 10, max: 16 }),
                longDesc,
                releaseDate: demo.releaseDaysAgo >= 0 ? new Date(Date.now() - demo.releaseDaysAgo * 86400000) : new Date(Date.now() + -demo.releaseDaysAgo * 86400000),
                ageRating: demo.ageRating,
                basePricePaisa: toPaisa(demo.priceRs),
                currency: "NPR",
                status: demo.status,
                isEarlyAccess: demo.earlyAccess,
                publishedAt: demo.status === GameStatus.PUBLISHED || demo.status === GameStatus.DELISTED
                    ? new Date(Date.now() - Math.max(demo.releaseDaysAgo, 1) * 86400000)
                    : null,
            },
        });
        if (gameCreated) gamesCreated += 1;

        // ---- taxonomy pivots (pure M:N rows, ON CONFLICT DO NOTHING) ----
        for (const genreName of demo.genres) {
            const genreId = genreIdByName.get(genreName);
            if (!genreId) throw new Error(`Genre missing: ${genreName} — run baseSeeder first`);
            const [, meta] = await sequelize.query(
                `INSERT INTO game_genres (game_id, genre_id) VALUES (:gameId, :genreId)
                 ON CONFLICT (game_id, genre_id) DO NOTHING`,
                { replacements: { gameId: game.id, genreId } },
            );
            if (insertedCount(meta) > 0) linksCreated += 1;
        }
        for (const tagName of demo.tags) {
            const tagId = tagIdByName.get(tagName);
            if (!tagId) throw new Error(`Tag missing: ${tagName} — run baseSeeder first`);
            const [, meta] = await sequelize.query(
                `INSERT INTO game_tags (game_id, tag_id) VALUES (:gameId, :tagId)
                 ON CONFLICT (game_id, tag_id) DO NOTHING`,
                { replacements: { gameId: game.id, tagId } },
            );
            if (insertedCount(meta) > 0) linksCreated += 1;
        }

        // ---- builds: 1.0.0 active everywhere, legacy 0.9.0 kept inactive ----
        const buildSpecs: Array<{ version: string; platform: Platform; active: boolean }> = [
            { version: "1.0.0", platform: Platform.WINDOWS, active: true },
        ];
        if (LINUX_BUILD_SLUGS.has(demo.slug)) {
            buildSpecs.push({ version: "1.0.0", platform: Platform.LINUX, active: true });
        }
        if (LEGACY_BUILD_SLUGS.has(demo.slug)) {
            buildSpecs.push({ version: "0.9.0", platform: Platform.WINDOWS, active: false });
        }

        for (const spec of buildSpecs) {
            const key = `${demo.slug}:${spec.version}:${spec.platform}`;
            const [, built] = await GameBuild.findOrCreate({
                where: { gameId: game.id, version: spec.version, platform: spec.platform },
                defaults: {
                    gameId: game.id,
                    version: spec.version,
                    platform: spec.platform,
                    fileSizeBytes: demo.sizeGb * 1024 * 1024 * 1024 + hashInt(key) % 500000000,
                    checksumSha256: sha256Hex(`build:${key}`),
                    cdnUrl: `https://cdn.elysian.example/builds/${demo.slug}/${spec.version}/${spec.platform.toLowerCase()}`,
                    changelog: spec.version === "0.9.0" ? "Pre-release preview build." : faker.lorem.sentence({ min: 6, max: 14 }),
                    isActive: spec.active,
                },
            });
            if (built) buildsCreated += 1;
        }

        // ---- MIN + REC requirement rows ----
        for (const type of [SystemRequirementType.MIN, SystemRequirementType.REC]) {
            const [, specCreated] = await SystemRequirement.findOrCreate({
                where: { gameId: game.id, type },
                defaults: { gameId: game.id, type, ...specFor(type, demo.sizeGb) },
            });
            if (specCreated) specsCreated += 1;
        }

        // ---- media: one cover (partial unique), 3 screenshots, 1 trailer ----
        const mediaRows: Array<{ type: MediaType; url: string; sortOrder: number }> = [
            { type: MediaType.COVER, url: `https://cdn.elysian.example/covers/${demo.slug}.jpg`, sortOrder: 0 },
            { type: MediaType.SCREENSHOT, url: `https://cdn.elysian.example/shots/${demo.slug}-1.jpg`, sortOrder: 1 },
            { type: MediaType.SCREENSHOT, url: `https://cdn.elysian.example/shots/${demo.slug}-2.jpg`, sortOrder: 2 },
            { type: MediaType.SCREENSHOT, url: `https://cdn.elysian.example/shots/${demo.slug}-3.jpg`, sortOrder: 3 },
            { type: MediaType.TRAILER, url: `https://cdn.elysian.example/trailers/${demo.slug}-trailer.mp4`, sortOrder: 4 },
        ];
        for (const row of mediaRows) {
            const mediaId = seedUuid(`media:${demo.slug}:${row.type}:${row.sortOrder}`);
            const [, mediaInserted] = await GameMedia.findOrCreate({
                where: { id: mediaId },
                defaults: {
                    id: mediaId,
                    gameId: game.id,
                    type: row.type,
                    url: row.url,
                    sortOrder: row.sortOrder,
                } as IGameMediaCreation,
            });
            if (mediaInserted) mediaCreated += 1;
        }
    }

    // ---- redeemable keys on the two flagship titles (deterministic hashes) ----
    const keyGames = ["snow-leopard-chronicles", "cyber-yeti"];
    for (const slug of keyGames) {
        const game = await Game.findOne({ where: { slug } });
        if (!game) throw new Error(`Key game missing: ${slug}`);
        for (let i = 1; i <= 3; i += 1) {
            const rawKey = `ELYX-${slug.slice(0, 4).toUpperCase()}-${String(i).padStart(4, "0")}-DEMO`;
            const [, keyInserted] = await GameKey.findOrCreate({
                where: { keyHash: sha256Hex(rawKey) },
                defaults: {
                    gameId: game.id,
                    keyHash: sha256Hex(rawKey),
                    status: GameKeyStatus.AVAILABLE,
                },
            });
            if (keyInserted) keysCreated += 1;
        }
    }

    return {
        created: {
            games: gamesCreated,
            taxonomyLinks: linksCreated,
            builds: buildsCreated,
            systemRequirements: specsCreated,
            media: mediaCreated,
            gameKeys: keysCreated,
        },
    };
};

if (require.main === module) {
    runGameSeeder()
        .then(({ created }) => console.log("Games seeded:", created))
        .catch((error) => {
            console.error("Game seeding failed:", error);
            process.exitCode = 1;
        });
}
