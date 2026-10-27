import bcrypt from "bcryptjs";
import { faker } from "@faker-js/faker";

import { AgeRating } from "../../enums/ageRatingEnum";
import { GameStatus } from "../../enums/gameStatusEnum";
import { MediaType } from "../../enums/mediaTypeEnum";
import { Platform } from "../../enums/platformEnum";
import { SystemRequirementType } from "../../enums/systemRequirementTypeEnum";
import { GameKeyStatus } from "../../enums/gameKeyStatusEnum";
import { PayoutCurrency } from "../../enums/payoutCurrencyEnum";
import { PublisherStatus } from "../../enums/publisherStatusEnum";
import { Role } from "../../enums/roleEnum";
import { UserStatus } from "../../enums/userStatusEnum";
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
import { DEMO_PASSWORD } from "./userSeeder";
import { FAKER_SEED, hashInt, insertedCount, seedUuid, sha256Hex } from "../seedUtils";

const { sequelize } = Database;

// ---------------------------------------------------------------------------
// The catalogue: 50 real Steam titles with their real publishers, release
// dates, age ratings and rupee prices (integer rupees — toPaisa converts once
// at the definition site, so no float ever reaches the DB). Every game is
// PUBLISHED and gets the full publishable package — one active build, one
// cover, 3 screenshots, a trailer and MIN + REC requirement rows — mirroring
// what gameServices.assertPublishable demands, plus redeemable game keys on
// two flagship titles.
//
// Publishers: publishers.owner_user_id is UNIQUE, so every studio in the list
// gets its own PUBLISHER-role account (email `${slug}@example.com`, the shared
// demo password) owning exactly one publisher row. Cover artwork points at
// the Steam CDN (header.jpg exists for every app id).
//
// Genres/tags are upserted by slug here, so the taxonomy always covers
// whatever the catalogue references even if baseSeeder's lists lag behind.
//
// All upserts hang off unique keys: games by slug, links by composite key
// (ON CONFLICT DO NOTHING), media and keys by deterministic ids/hashes —
// safe to re-run forever. Build changelog text is faker-generated AFTER
// faker.seed(12345), so it is byte-identical on every run.
// ---------------------------------------------------------------------------

interface SeedGame {
    steamId: number;
    slug: string;
    title: string;
    publisher: string;
    releaseDate: string; // YYYY-MM-DD
    ageRating: "E" | "T" | "M" | "AO";
    priceRs: number; // rupees, 0 = free to play
    genres: string[];
    tags: string[];
    shortDesc: string;
    longDesc: string;
    earlyAccess?: boolean;
}

const g = (
    steamId: number,
    slug: string,
    title: string,
    publisher: string,
    releaseDate: string,
    ageRating: SeedGame["ageRating"],
    priceRs: number,
    genres: string[],
    tags: string[],
    shortDesc: string,
    longDesc: string,
    earlyAccess = false,
): SeedGame => ({
    steamId,
    slug,
    title,
    publisher,
    releaseDate,
    ageRating,
    priceRs,
    genres,
    tags,
    shortDesc,
    longDesc,
    earlyAccess,
});

export const GAMES: SeedGame[] = [
    g(730, "counter-strike-2", "Counter-Strike 2", "Valve", "2023-09-27", "M", 0, ["FPS"], ["Multiplayer", "Competitive", "Team-Based"], "The long-running competitive team shooter, rebuilt.", "Two teams, one bomb, and tight tactical gunplay. Smoke grenades, economy rounds and ranked matchmaking keep every match different."),
    g(570, "dota-2", "Dota 2", "Valve", "2013-07-09", "T", 0, ["Strategy"], ["Multiplayer", "MOBA", "Competitive"], "A deep 5v5 team battle with over a hundred heroes.", "Draft your heroes, farm gold and push lanes to destroy the enemy Ancient. Famous for its skill ceiling and huge esports scene."),
    g(1245620, "elden-ring", "Elden Ring", "Bandai Namco", "2022-02-25", "M", 7499, ["RPG", "Action"], ["Open World", "Singleplayer", "Co-op"], "A vast open-world action RPG from FromSoftware.", "Explore the Lands Between, fight towering bosses and build your character your way. World design by Hidetaka Miyazaki, with story elements by George R. R. Martin."),
    g(1086940, "baldurs-gate-3", "Baldur's Gate 3", "Larian Studios", "2023-08-03", "M", 7499, ["RPG"], ["Story Rich", "Co-op", "Turn-Based"], "A choice-heavy party RPG set in the Forgotten Realms.", "Gather a party, make hard decisions and fight in turn-based combat. Almost every situation has more than one way to play out."),
    g(1091500, "cyberpunk-2077", "Cyberpunk 2077", "CD PROJEKT RED", "2020-12-10", "M", 5999, ["RPG", "Action"], ["Open World", "Singleplayer", "Story Rich"], "An open-world story set in the neon sprawl of Night City.", "Play as a mercenary chasing a one-of-a-kind implant. Hack, shoot or talk your way through a dense futuristic city."),
    g(292030, "the-witcher-3-wild-hunt", "The Witcher 3: Wild Hunt", "CD PROJEKT RED", "2015-05-18", "M", 1999, ["RPG"], ["Open World", "Story Rich", "Singleplayer"], "Hunt monsters and search for a lost loved one as Geralt.", "A huge fantasy world with branching quests and memorable characters. Widely considered one of the best RPGs ever made."),
    g(1174180, "red-dead-redemption-2", "Red Dead Redemption 2", "Rockstar Games", "2019-11-05", "M", 5999, ["Action", "Adventure"], ["Open World", "Story Rich", "Singleplayer"], "An outlaw gang tries to survive the end of the Wild West.", "Follow Arthur Morgan through a detailed frontier world full of side stories, hunting and camp life."),
    g(271590, "grand-theft-auto-v", "Grand Theft Auto V", "Rockstar Games", "2015-04-14", "M", 2999, ["Action"], ["Open World", "Multiplayer", "Crime"], "Three criminals, one sprawling city, endless chaos.", "Switch between three protagonists in a satirical take on Southern California. Includes the GTA Online multiplayer mode."),
    g(1145360, "hades", "Hades", "Supergiant Games", "2020-09-17", "T", 2499, ["Action", "Indie"], ["Roguelike", "Story Rich", "Singleplayer"], "Fight out of the Underworld in this fast roguelike.", "Each escape attempt plays differently, and the story moves forward even when you die. Smooth combat with many weapons and boons."),
    g(367520, "hollow-knight", "Hollow Knight", "Team Cherry", "2017-02-24", "E", 999, ["Indie", "Action"], ["Metroidvania", "Singleplayer", "Hand-Drawn"], "A hand-drawn action adventure in a ruined insect kingdom.", "Explore a huge interconnected world, learn new abilities and face tough bosses. Great value for the amount of content."),
    g(413150, "stardew-valley", "Stardew Valley", "ConcernedApe", "2016-02-26", "E", 999, ["Simulation", "Indie"], ["Farming", "Co-op", "Relaxing"], "Inherit a farm and build a new life in the countryside.", "Grow crops, raise animals, mine, fish and befriend the villagers. A cosy game you can play for hundreds of hours."),
    g(105600, "terraria", "Terraria", "Re-Logic", "2011-05-16", "T", 799, ["Indie", "Action"], ["Sandbox", "Co-op", "Pixel Art"], "Dig, fight, explore and build in a 2D sandbox world.", "Mine resources, craft gear and take on bosses alone or with friends. Constant updates have added a lot of content."),
    g(620, "portal-2", "Portal 2", "Valve", "2011-04-19", "E", 799, ["Puzzle"], ["Co-op", "Story Rich", "Singleplayer"], "A puzzle classic built around the portal gun.", "Solve clever physics puzzles in a funny story campaign. The two-player co-op mode has its own set of test chambers."),
    g(546560, "half-life-alyx", "Half-Life: Alyx", "Valve", "2020-03-23", "M", 3999, ["FPS", "Action"], ["VR", "Story Rich", "Singleplayer"], "A VR return to the Half-Life universe.", "Play as Alyx Vance, solving puzzles and fighting through City 17. Requires a supported VR headset."),
    g(374320, "dark-souls-iii", "DARK SOULS III", "Bandai Namco", "2016-04-12", "M", 4499, ["RPG", "Action"], ["Souls-like", "Singleplayer", "Co-op"], "A dark fantasy action RPG with demanding combat.", "Fast, punishing fights and moody levels. Ideal if you want a challenge that rewards patience."),
    g(814380, "sekiro-shadows-die-twice", "Sekiro: Shadows Die Twice", "Activision", "2019-03-22", "M", 5999, ["Action"], ["Souls-like", "Singleplayer", "Difficult"], "A shinobi action game built on sword-clash combat.", "Play as a one-armed warrior in Sengoku-era Japan. Posture-based duels and a grappling hook set it apart."),
    g(582010, "monster-hunter-world", "Monster Hunter: World", "Capcom", "2018-08-09", "T", 2999, ["Action", "RPG"], ["Co-op", "Multiplayer", "Open World"], "Hunt huge monsters alone or with three friends.", "Track creatures across living ecosystems, craft gear from their parts and master one of fourteen weapon types."),
    g(782330, "doom-eternal", "DOOM Eternal", "Bethesda", "2020-03-20", "M", 3999, ["FPS", "Action"], ["Fast-Paced", "Singleplayer", "Gore"], "Relentless, high-speed demon slaying.", "Chain weapons, glory kills and movement to stay alive. A resource-driven shooter that keeps you moving."),
    g(2050650, "resident-evil-4", "Resident Evil 4", "Capcom", "2023-03-24", "M", 5999, ["Horror", "Action"], ["Survival Horror", "Singleplayer", "Remake"], "A modern remake of the survival horror classic.", "Rescue the president's daughter from a hostile village. Tense combat, tough resource choices and memorable boss fights."),
    g(990080, "hogwarts-legacy", "Hogwarts Legacy", "Warner Bros. Games", "2023-02-10", "T", 5999, ["RPG", "Action"], ["Open World", "Singleplayer", "Magic"], "An open-world wizarding school adventure.", "Attend classes, learn spells, explore the castle and uncover a secret tied to the goblin rebellion."),
    g(1623730, "palworld", "Palworld", "Pocketpair", "2024-01-19", "T", 2499, ["Survival", "Action"], ["Open World", "Co-op", "Crafting"], "Catch creatures, build bases and survive together.", "Capture Pals, put them to work and craft your way up. Supports co-op and dedicated servers.", true),
    g(553850, "helldivers-2", "HELLDIVERS 2", "Sony Interactive Entertainment", "2024-02-08", "T", 4499, ["Action", "FPS"], ["Co-op", "Multiplayer", "Sci-Fi"], "Squad-based co-op shooter for Super Earth.", "Drop in with friends, call in stratagems and spread managed democracy across hostile planets."),
    g(1172470, "apex-legends", "Apex Legends", "Electronic Arts", "2020-11-04", "T", 0, ["FPS"], ["Battle Royale", "Multiplayer", "Hero Shooter"], "A free hero-based battle royale.", "Squads of three drop in, loot up and fight to be the last team standing. Each Legend brings unique abilities."),
    g(252950, "rocket-league", "Rocket League", "Psyonix", "2015-07-07", "E", 0, ["Racing"], ["Multiplayer", "Sports", "Competitive"], "Soccer, but with rocket-powered cars.", "Easy to pick up and very hard to master. Play ranked, casual or with friends in local and online modes."),
    g(252490, "rust", "Rust", "Facepunch Studios", "2018-02-08", "M", 3999, ["Survival"], ["Multiplayer", "Open World", "PvP"], "Survive, build and raid on tough multiplayer servers.", "Start with nothing, gather resources and defend your base from other players."),
    g(892970, "valheim", "Valheim", "Coffee Stain Publishing", "2021-02-02", "T", 1499, ["Survival", "Indie"], ["Co-op", "Open World", "Crafting"], "A Viking survival adventure for up to ten players.", "Build longhouses, sail the seas and defeat the forces of the Norse afterlife with friends.", true),
    g(264710, "subnautica", "Subnautica", "Unknown Worlds", "2018-01-23", "T", 1999, ["Survival", "Adventure"], ["Open World", "Singleplayer", "Exploration"], "Crash-land on an ocean planet and survive underwater.", "Explore coral reefs and deep trenches, craft vehicles and uncover the secrets of the alien world."),
    g(427520, "factorio", "Factorio", "Wube Software", "2020-08-14", "E", 3499, ["Simulation", "Strategy"], ["Automation", "Co-op", "Base Building"], "Build and automate sprawling factories.", "Mine, smelt and assemble ever bigger production lines while defending against local wildlife."),
    g(289070, "sid-meiers-civilization-vi", "Sid Meier's Civilization VI", "2K", "2016-10-21", "T", 4999, ["Strategy"], ["Turn-Based", "4X", "Multiplayer"], "Lead a civilization from the Stone Age to the future.", "Found cities, research technology and pursue victory through science, culture, religion or conquest."),
    g(1142710, "total-war-warhammer-iii", "Total War: WARHAMMER III", "SEGA", "2022-02-17", "M", 5999, ["Strategy"], ["Fantasy", "Turn-Based", "Real-Time"], "Grand strategy meets massive fantasy battles.", "Manage empires on the campaign map and command huge armies in real-time clashes across the Realm of Chaos."),
    g(632470, "disco-elysium", "Disco Elysium - The Final Cut", "ZA/UM", "2019-10-15", "M", 2999, ["RPG"], ["Story Rich", "Singleplayer", "Detective"], "A dialogue-driven detective RPG.", "Solve a murder as an amnesiac cop whose own skills argue with each other. No combat, just choices."),
    g(504230, "celeste", "Celeste", "Maddy Makes Games", "2018-01-25", "E", 999, ["Indie"], ["Platformer", "Pixel Art", "Difficult"], "A precise platformer about climbing a mountain.", "Help Madeline face her inner struggles on the climb. Tough but fair, with optional assists."),
    g(268910, "cuphead", "Cuphead", "Studio MDHR", "2017-09-29", "E", 1499, ["Action", "Indie"], ["Co-op", "Hand-Drawn", "Difficult"], "A run-and-gun boss rush in 1930s cartoon style.", "Hand-drawn animation and jazz music wrap a demanding set of boss fights. Playable in local co-op."),
    g(391540, "undertale", "Undertale", "Toby Fox", "2015-09-15", "E", 499, ["RPG", "Indie"], ["Pixel Art", "Story Rich", "Singleplayer"], "An RPG where you never have to fight.", "Spare or fight the monsters you meet. Your choices change the story and the ending."),
    g(646570, "slay-the-spire", "Slay the Spire", "Mega Crit Games", "2019-01-23", "T", 1299, ["Strategy", "Indie"], ["Roguelike", "Card Game", "Singleplayer"], "A deckbuilding roguelike.", "Build a unique deck, find relics and climb the Spire. Each run is a new puzzle."),
    g(945360, "among-us", "Among Us", "Innersloth", "2018-11-16", "E", 399, ["Indie"], ["Multiplayer", "Social Deduction", "Party"], "Find the impostor before it is too late.", "Complete tasks on a spaceship while hunting for the saboteur. Great for friend groups."),
    g(550, "left-4-dead-2", "Left 4 Dead 2", "Valve", "2009-11-17", "M", 799, ["FPS"], ["Co-op", "Zombies", "Multiplayer"], "Four survivors fight through hordes of infected.", "Cooperative zombie shooter where an AI Director changes each run. Includes versus modes."),
    g(440, "team-fortress-2", "Team Fortress 2", "Valve", "2007-10-10", "M", 0, ["FPS"], ["Multiplayer", "Class-Based", "Humor"], "A colourful class-based team shooter.", "Nine distinct classes, objective-based maps and a huge community-made content library."),
    g(227300, "euro-truck-simulator-2", "Euro Truck Simulator 2", "SCS Software", "2012-10-19", "E", 1499, ["Simulation", "Racing"], ["Driving", "Relaxing", "Open World"], "Haul cargo across Europe.", "Build a trucking business, customise your rig and drive relaxing long routes."),
    g(1551360, "forza-horizon-5", "Forza Horizon 5", "Xbox Game Studios", "2021-11-09", "E", 5999, ["Racing"], ["Open World", "Multiplayer", "Driving"], "An open-world racing festival in Mexico.", "Hundreds of cars, varied terrain and seasonal events keep the racing fresh."),
    g(2208920, "assassins-creed-valhalla", "Assassin's Creed Valhalla", "Ubisoft", "2020-11-10", "M", 4999, ["Action", "RPG"], ["Open World", "Singleplayer", "Historical"], "Lead a Viking clan to settle in England.", "Raid, build a settlement and take part in political intrigue across a large map."),
    g(377160, "fallout-4", "Fallout 4", "Bethesda", "2015-11-10", "M", 1999, ["RPG", "Action"], ["Open World", "Post-Apocalyptic", "Singleplayer"], "Rebuild a wasteland in this open-world RPG.", "Search for your missing son, craft weapons and build settlements in the ruins of Boston."),
    g(489830, "skyrim-special-edition", "The Elder Scrolls V: Skyrim Special Edition", "Bethesda", "2016-10-27", "M", 2999, ["RPG"], ["Open World", "Singleplayer", "Mods"], "An open-world fantasy RPG with huge mod support.", "Become the Dragonborn and explore a snowy province. Mods can keep it fresh for years."),
    g(1687950, "persona-5-royal", "Persona 5 Royal", "SEGA", "2022-10-21", "M", 5999, ["RPG"], ["JRPG", "Story Rich", "Turn-Based"], "A stylish JRPG about teen phantom thieves.", "Balance school life with dungeon crawling in a long, character-driven story."),
    g(2358720, "black-myth-wukong", "Black Myth: Wukong", "Game Science", "2024-08-20", "M", 5999, ["Action", "RPG"], ["Souls-like", "Mythology", "Singleplayer"], "An action RPG inspired by Journey to the West.", "Fight mythic bosses with a staff and transformations in lavish Chinese-folklore settings."),
    g(1966720, "lethal-company", "Lethal Company", "Zeekerss", "2023-10-23", "T", 999, ["Horror", "Indie"], ["Co-op", "Multiplayer", "Comedy"], "Scavenge dangerous moons with friends.", "Collect scrap to meet a quota while avoiding monsters. Proximity voice chat makes it funny and tense.", true),
    g(1172620, "sea-of-thieves", "Sea of Thieves", "Xbox Game Studios", "2020-06-03", "T", 3999, ["Adventure", "Action"], ["Multiplayer", "Co-op", "Pirates"], "Sail, fight and plunder as a pirate crew.", "Crew a ship with friends, hunt treasure and battle other players on the open sea."),
    g(1426210, "it-takes-two", "It Takes Two", "Electronic Arts", "2021-03-26", "T", 3999, ["Adventure"], ["Co-op", "Story Rich", "Puzzle"], "A co-op-only adventure with endlessly inventive levels.", "Two players, one split-screen story. Every chapter introduces new mechanics."),
    g(359550, "rainbow-six-siege", "Tom Clancy's Rainbow Six Siege", "Ubisoft", "2015-12-01", "M", 1999, ["FPS"], ["Multiplayer", "Tactical", "Competitive"], "Tactical 5v5 close-quarters shooter.", "Attackers breach, defenders fortify, and destructible walls make every round different."),
    g(870780, "control", "Control Ultimate Edition", "505 Games", "2019-08-27", "M", 2499, ["Action"], ["Singleplayer", "Supernatural", "Story Rich"], "A supernatural action game in a shifting government building.", "Wield the Service Weapon and psychic powers in a mysterious, ever-changing Oldest House."),
];

// Linux builds for the cross-platform titles; an older inactive build on two
// of the big ones so "version history" isn't empty.
const LINUX_BUILD_SLUGS = new Set(["stardew-valley", "terraria", "factorio", "hollow-knight"]);
const LEGACY_BUILD_SLUGS = new Set(["cyberpunk-2077", "grand-theft-auto-v"]);

// Redeemable demo keys ride on two flagship purchases.
const KEY_GAME_SLUGS = ["elden-ring", "cyberpunk-2077"];

// Steam CDN artwork: header.jpg (600x300) exists for every app id.
const coverUrlFor = (steamId: number): string =>
    `https://cdn.akamai.steamstatic.com/steam/apps/${steamId}/header.jpg`;

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
    // Fixed seed → identical build changelogs on every run.
    faker.seed(FAKER_SEED);

    let usersCreated = 0;
    let publishersCreated = 0;
    let genresCreated = 0;
    let tagsCreated = 0;
    let gamesCreated = 0;
    let linksCreated = 0;
    let buildsCreated = 0;
    let specsCreated = 0;
    let mediaCreated = 0;
    let keysCreated = 0;

    // ---- publishers: one studio per row, one owner account per studio ----
    // publishers.owner_user_id carries a UNIQUE index, so ownership can never
    // be shared: each company in GAMES gets its own PUBLISHER-role login
    // (email `${slug}@example.com`, shared demo password) owning one row.
    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
    const studioNames = [...new Set(GAMES.map((game) => game.publisher))];
    const studioSlugs = studioNames.map(slugify);
    if (new Set(studioSlugs).size !== studioSlugs.length) {
        throw new Error("Publisher names collide after slugify — disambiguate the GAMES list");
    }

    const publisherIdByName = new Map<string, string>();
    for (let i = 0; i < studioNames.length; i += 1) {
        const name = studioNames[i];
        const ownerKey = studioSlugs[i];
        const email = `${ownerKey}@example.com`;

        const [owner, ownerCreated] = await User.findOrCreate({
            where: { email },
            defaults: {
                email,
                username: ownerKey,
                passwordHash,
                role: Role.PUBLISHER,
                countryCode: "NP",
                birthDate: new Date("1990-01-01T00:00:00.000Z"),
                status: UserStatus.ACTIVE,
                emailVerifiedAt: new Date("2026-01-01T00:00:00.000Z"),
            },
        });
        if (ownerCreated) usersCreated += 1;

        const [publisher, publisherCreated] = await Publisher.findOrCreate({
            where: { ownerUserId: owner.id },
            defaults: {
                name,
                legalName: name,
                taxId: null,
                payoutAccount: null,
                payoutCurrency: PayoutCurrency.NPR,
                revenueSharePct: 60 + (hashInt(`revenue-share:${name}`) % 26),
                status: PublisherStatus.VERIFIED,
                ownerUserId: owner.id,
            },
        });
        if (publisherCreated) publishersCreated += 1;
        publisherIdByName.set(name, publisher.id);
    }

    // ---- taxonomy: upsert every genre/tag the catalogue references ----
    for (const name of [...new Set(GAMES.flatMap((game) => game.genres))]) {
        const slug = slugify(name);
        const [, created] = await Genre.findOrCreate({ where: { slug }, defaults: { name, slug } });
        if (created) genresCreated += 1;
    }
    for (const name of [...new Set(GAMES.flatMap((game) => game.tags))]) {
        const slug = slugify(name);
        const [, created] = await Tag.findOrCreate({ where: { slug }, defaults: { name, slug } });
        if (created) tagsCreated += 1;
    }
    // Keyed by slug, not name: an existing row may carry different casing
    // than the catalogue entry ("Hand-drawn" vs "Hand-Drawn").
    const genreIdBySlug = new Map((await Genre.findAll()).map((row) => [row.slug, row.id]));
    const tagIdBySlug = new Map((await Tag.findAll()).map((row) => [row.slug, row.id]));

    for (const demo of GAMES) {
        const publisherId = publisherIdByName.get(demo.publisher);
        if (!publisherId) {
            throw new Error(`Publisher missing: ${demo.publisher} — publisher setup failed`);
        }

        // Deterministic install size: stable per slug, plausible range.
        const sizeGb = 10 + (hashInt(`size:${demo.slug}`) % 60);
        const releaseDate = new Date(`${demo.releaseDate}T00:00:00.000Z`);

        const [game, gameCreated] = await Game.findOrCreate({
            where: { slug: demo.slug },
            defaults: {
                publisherId,
                title: demo.title,
                slug: demo.slug,
                shortDesc: demo.shortDesc,
                longDesc: demo.longDesc,
                releaseDate,
                ageRating: demo.ageRating as AgeRating,
                basePricePaisa: toPaisa(demo.priceRs),
                currency: "NPR",
                status: GameStatus.PUBLISHED,
                isEarlyAccess: demo.earlyAccess ?? false,
                publishedAt: releaseDate,
            },
        });
        if (gameCreated) gamesCreated += 1;

        // ---- taxonomy pivots (pure M:N rows, ON CONFLICT DO NOTHING) ----
        for (const genreName of demo.genres) {
            const genreId = genreIdBySlug.get(slugify(genreName));
            if (!genreId) throw new Error(`Genre missing: ${genreName} — upsert failed`);
            const [, meta] = await sequelize.query(
                `INSERT INTO game_genres (game_id, genre_id) VALUES (:gameId, :genreId)
                 ON CONFLICT (game_id, genre_id) DO NOTHING`,
                { replacements: { gameId: game.id, genreId } },
            );
            if (insertedCount(meta) > 0) linksCreated += 1;
        }
        for (const tagName of demo.tags) {
            const tagId = tagIdBySlug.get(slugify(tagName));
            if (!tagId) throw new Error(`Tag missing: ${tagName} — upsert failed`);
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
                    fileSizeBytes: sizeGb * 1024 * 1024 * 1024 + hashInt(key) % 500000000,
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
                defaults: { gameId: game.id, type, ...specFor(type, sizeGb) },
            });
            if (specCreated) specsCreated += 1;
        }

        // ---- media: Steam cover (partial unique), 3 screenshots, 1 trailer ----
        const mediaRows: Array<{ type: MediaType; url: string; sortOrder: number }> = [
            { type: MediaType.COVER, url: coverUrlFor(demo.steamId), sortOrder: 0 },
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

    // ---- redeemable keys on the flagship titles (deterministic hashes) ----
    for (const slug of KEY_GAME_SLUGS) {
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
            users: usersCreated,
            publishers: publishersCreated,
            genres: genresCreated,
            tags: tagsCreated,
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
