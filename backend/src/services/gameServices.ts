import { Transaction } from "sequelize";

import { Database } from "../config";
import { AGE_RATINGS, AgeRating } from "../enums/ageRatingEnum";
import { PLATFORMS, Platform } from "../enums/platformEnum";
import { MEDIA_TYPES, MediaType } from "../enums/mediaTypeEnum";
import { Role } from "../enums/roleEnum";
import { CUSTOMER_VISIBLE_GAME_STATUSES, GAME_STATUSES, GameStatus } from "../enums/gameStatusEnum";
import { SYSTEM_REQUIREMENT_TYPES } from "../enums/systemRequirementTypeEnum";
import { IGame } from "../interfaces/gameInterface";
import {
    GameBuildRepository,
    GameMediaRepository,
    GameRepository,
    GameTaxonomyRepository,
    GenreRepository,
    PublisherRepository,
    SystemRequirementRepository,
    TagRepository,
} from "../repositories";
import AppError from "../utils/appError";
import { slugify } from "../utils";
import { Action, assertCan } from "./accessControl";
import { audit, AUDIT_ACTIONS } from "./auditServices";
import { priceSummaryForGame } from "./pricingServices";
import { requireOwnedPublisher } from "./publisherServices";

const { sequelize } = Database;

const SEMVER_RE = /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/;
const SHA256_RE = /^[a-f0-9]{64}$/i;

const uniqueSlug = async (title: string): Promise<string> => {
    const base = slugify(title);
    let candidate = base;
    for (let i = 2; i < 50; i += 1) {
        if (!(await GameRepository.slugExists(candidate))) return candidate;
        candidate = `${base}-${i}`;
    }
    return `${base}-${Date.now().toString(36)}`;
};

/** Loads a game the actor is allowed to manage (owner publisher or admin). */
export const loadOwnedGame = async (
    gameId: string,
    actor: { id: string; role: Role },
): Promise<{ game: NonNullable<Awaited<ReturnType<typeof GameRepository.findById>>> }> => {
    const game = await GameRepository.findById(gameId);
    if (!game) throw AppError.notFound("Game not found");
    if (actor.role === Role.ADMIN) return { game };

    const publisher = await requireOwnedPublisher(actor.id);
    // The caller is a publisher but not the owner of *this* game: the game
    // exists, they simply may not touch it. Missing games stay 404; another
    // publisher's game is a 403 so ownership bugs surface as permission
    // errors rather than phantom "not found"s.
    if (game.publisherId !== publisher.id) throw AppError.forbidden("You do not own this game");
    return { game };
};

// ---------------------------------------------------------------------------
// Publisher CRUD
// ---------------------------------------------------------------------------
export const create = async (
    actor: { id: string; role: Role },
    body: {
        title: string;
        shortDesc: string;
        longDesc?: string;
        releaseDate?: Date;
        ageRating?: AgeRating;
        basePricePaisa?: number;
        isEarlyAccess?: boolean;
    },
    ip?: string,
) => {
    assertCan(actor.role, Action.GAME_CREATE);
    const publisher = await requireOwnedPublisher(actor.id);

    const game = await GameRepository.create({
        publisherId: publisher.id,
        title: body.title,
        slug: await uniqueSlug(body.title),
        shortDesc: body.shortDesc,
        longDesc: body.longDesc ?? null,
        releaseDate: body.releaseDate ?? null,
        ageRating: body.ageRating ?? AgeRating.E,
        basePricePaisa: body.basePricePaisa ?? 0,
        currency: "NPR",
        status: GameStatus.DRAFT,
        isEarlyAccess: body.isEarlyAccess ?? false,
        publishedAt: null,
    });

    await audit({
        actorId: actor.id,
        action: AUDIT_ACTIONS.GAME_CREATED,
        entity: "game",
        entityId: game.id,
        diff: { title: body.title },
        ip,
    });
    return game;
};

export const update = async (
    gameId: string,
    actor: { id: string; role: Role },
    body: Partial<{
        title: string;
        shortDesc: string;
        longDesc: string;
        releaseDate: Date;
        ageRating: AgeRating;
        basePricePaisa: number;
        isEarlyAccess: boolean;
    }>,
    ip?: string,
) => {
    const { game } = await loadOwnedGame(gameId, actor);
    if (game.status === GameStatus.IN_REVIEW) {
        throw AppError.badRequest("Withdraw the game from review before editing");
    }

    const priceChanged = body.basePricePaisa !== undefined && body.basePricePaisa !== game.basePricePaisa;
    const fields: Partial<IGame> = { ...body };
    if (body.title && body.title !== game.title) {
        fields.slug = await uniqueSlug(body.title);
    }
    await GameRepository.updateById(gameId, fields);

    // Price changes are audit-trail events (spec requirement).
    if (priceChanged) {
        await audit({
            actorId: actor.id,
            action: AUDIT_ACTIONS.GAME_PRICE_CHANGED,
            entity: "game",
            entityId: gameId,
            diff: { from: game.basePricePaisa, to: body.basePricePaisa },
            ip,
        });
    } else {
        await audit({
            actorId: actor.id,
            action: AUDIT_ACTIONS.GAME_UPDATED,
            entity: "game",
            entityId: gameId,
            diff: body,
            ip,
        });
    }
    return GameRepository.findById(gameId);
};

export const remove = async (gameId: string, actor: { id: string; role: Role }) => {
    const { game } = await loadOwnedGame(gameId, actor);
    if (game.status === GameStatus.PUBLISHED) {
        throw AppError.badRequest("Delist the game before deleting it");
    }
    await sequelize.transaction(async (t) => {
        await GameTaxonomyRepository.setGenres(gameId, [], t);
        await GameTaxonomyRepository.setTags(gameId, [], t);
        await sequelize.query(`DELETE FROM games WHERE id = :gameId`, {
            replacements: { gameId },
            transaction: t,
        });
    });
};

// ---------------------------------------------------------------------------
// Publishing gate: PUBLISHED requires an active build, one cover, 3+
// screenshots, MIN+REC requirements (REC >= MIN) and a VERIFIED publisher.
// ---------------------------------------------------------------------------
export const assertPublishable = async (gameId: string): Promise<void> => {
    const builds = await GameBuildRepository.listByGame(gameId);
    const problems: string[] = [];

    if (!builds.some((b) => b.isActive)) problems.push("at least one active build");
    if (!(await GameMediaRepository.findCover(gameId))) problems.push("a cover image");
    const screenshots = await GameMediaRepository.countScreenshots(gameId);
    if (screenshots < 3) problems.push(`3+ screenshots (currently ${screenshots})`);

    const requirements = await SystemRequirementRepository.listByGame(gameId);
    const min = requirements.find((r) => r.type === "MIN");
    const rec = requirements.find((r) => r.type === "REC");
    if (!min) problems.push("MIN system requirements");
    if (!rec) problems.push("REC system requirements");
    if (min && rec && (rec.ramGb < min.ramGb || rec.storageGb < min.storageGb)) {
        problems.push("REC requirements that are >= MIN on RAM and storage");
    }

    if (problems.length > 0) {
        throw AppError.badRequest(`Before publishing, the game needs: ${problems.join(", ")}`);
    }
};

const requireVerified = async (publisherId: string): Promise<void> => {
    const publisher = await PublisherRepository.findById(publisherId);
    if (!publisher || publisher.status !== "VERIFIED") {
        throw AppError.forbidden("The publisher of this game is not verified");
    }
};

export const submit = async (
    gameId: string,
    actor: { id: string; role: Role },
    ip?: string,
) => {
    const { game } = await loadOwnedGame(gameId, actor);
    if (game.status !== GameStatus.DRAFT) {
        throw AppError.badRequest("Only draft games can be submitted for review");
    }
    await assertPublishable(gameId);
    await GameRepository.updateById(gameId, { status: GameStatus.IN_REVIEW });
    await audit({
        actorId: actor.id,
        action: AUDIT_ACTIONS.GAME_SUBMITTED,
        entity: "game",
        entityId: gameId,
        ip,
    });
    return GameRepository.findById(gameId);
};

export const withdraw = async (gameId: string, actor: { id: string; role: Role }) => {
    const { game } = await loadOwnedGame(gameId, actor);
    if (game.status !== GameStatus.IN_REVIEW) {
        throw AppError.badRequest("This game is not in review");
    }
    await GameRepository.updateById(gameId, { status: GameStatus.DRAFT });
    return GameRepository.findById(gameId);
};

export const adminApprove = async (gameId: string, adminId: string, ip?: string) => {
    const game = await GameRepository.findById(gameId);
    if (!game) throw AppError.notFound("Game not found");
    if (game.status !== GameStatus.IN_REVIEW) {
        throw AppError.badRequest("This game is not awaiting approval");
    }
    await assertPublishable(gameId);
    await requireVerified(game.publisherId);
    await GameRepository.updateById(gameId, {
        status: GameStatus.PUBLISHED,
        publishedAt: new Date(),
    });
    await audit({
        actorId: adminId,
        action: AUDIT_ACTIONS.GAME_APPROVED,
        entity: "game",
        entityId: gameId,
        ip,
    });
    return GameRepository.findById(gameId);
};

export const adminReject = async (gameId: string, adminId: string, ip?: string) => {
    const game = await GameRepository.findById(gameId);
    if (!game) throw AppError.notFound("Game not found");
    if (game.status !== GameStatus.IN_REVIEW) {
        throw AppError.badRequest("This game is not awaiting approval");
    }
    await GameRepository.updateById(gameId, { status: GameStatus.DRAFT });
    await audit({
        actorId: adminId,
        action: AUDIT_ACTIONS.GAME_REJECTED,
        entity: "game",
        entityId: gameId,
        ip,
    });
    return GameRepository.findById(gameId);
};

export const adminDelist = async (gameId: string, adminId: string, ip?: string) => {
    const game = await GameRepository.findById(gameId);
    if (!game) throw AppError.notFound("Game not found");
    if (game.status !== GameStatus.PUBLISHED) {
        throw AppError.badRequest("Only published games can be delisted");
    }
    await GameRepository.updateById(gameId, { status: GameStatus.DELISTED });
    await audit({
        actorId: adminId,
        action: AUDIT_ACTIONS.GAME_DELISTED,
        entity: "game",
        entityId: gameId,
        ip,
    });
    return GameRepository.findById(gameId);
};

export const adminRelist = async (gameId: string, adminId: string, ip?: string) => {
    const game = await GameRepository.findById(gameId);
    if (!game) throw AppError.notFound("Game not found");
    if (game.status !== GameStatus.DELISTED) {
        throw AppError.badRequest("Only delisted games can be re-listed");
    }
    await assertPublishable(gameId);
    await requireVerified(game.publisherId);
    await GameRepository.updateById(gameId, { status: GameStatus.PUBLISHED });
    await audit({
        actorId: adminId,
        action: AUDIT_ACTIONS.GAME_RELISTED,
        entity: "game",
        entityId: gameId,
        ip,
    });
    return GameRepository.findById(gameId);
};

// ---------------------------------------------------------------------------
// Builds
// ---------------------------------------------------------------------------
export const listBuilds = async (gameId: string, actor: { id: string; role: Role }) => {
    await loadOwnedGame(gameId, actor);
    return GameBuildRepository.listByGame(gameId);
};

export const addBuild = async (
    gameId: string,
    actor: { id: string; role: Role },
    body: {
        version: string;
        platform: Platform;
        fileSizeBytes: number;
        checksumSha256: string;
        cdnUrl: string;
        changelog?: string;
        isActive?: boolean;
    },
    ip?: string,
) => {
    await loadOwnedGame(gameId, actor);
    if (!SEMVER_RE.test(body.version)) throw AppError.badRequest("version must be semver (e.g. 1.0.0)");
    if (!SHA256_RE.test(body.checksumSha256)) {
        throw AppError.badRequest("checksumSha256 must be 64 hex characters");
    }
    if (!PLATFORMS.includes(body.platform)) throw AppError.badRequest("Invalid platform");
    if (!body.fileSizeBytes || body.fileSizeBytes <= 0) {
        throw AppError.badRequest("fileSizeBytes must be positive");
    }

    try {
        return await sequelize.transaction(async (t) => {
            // Clear the current active row(s) FIRST: the partial unique index
            // only allows one is_active row per (game_id, platform).
            if (body.isActive) {
                await GameBuildRepository.deactivateAll(gameId, body.platform, t);
            }
            return GameBuildRepository.create(
                {
                    gameId,
                    version: body.version,
                    platform: body.platform,
                    fileSizeBytes: body.fileSizeBytes,
                    checksumSha256: body.checksumSha256.toLowerCase(),
                    cdnUrl: body.cdnUrl,
                    changelog: body.changelog ?? null,
                    isActive: body.isActive ?? false,
                },
                t,
            );
        });
    } catch (error) {
        if ((error as Error).name.includes("UniqueConstraint")) {
            const err = error as Error & { original?: { constraint?: string }; parent?: { constraint?: string } };
            const constraint = err.original?.constraint ?? err.parent?.constraint ?? "";
            if (constraint.includes("active_platform")) {
                // Lost a race against a concurrent create/activate.
                throw AppError.conflict("Another build for this platform was activated at the same time; try again");
            }
            throw AppError.conflict("A build with this version and platform already exists");
        }
        throw error;
    }
};

export const activateBuild = async (
    buildId: string,
    actor: { id: string; role: Role },
    ip?: string,
) => {
    const build = await GameBuildRepository.findById(buildId);
    if (!build) throw AppError.notFound("Build not found");
    await loadOwnedGame(build.gameId, actor);
    await sequelize.transaction(async (t) => {
        // Deactivate FIRST: the partial unique index rejects a second active
        // row per (game_id, platform), so the flip must happen after clearing.
        await GameBuildRepository.deactivateAll(build.gameId, build.platform, t);
        await build.update({ isActive: true }, { transaction: t });
    });
    await audit({
        actorId: actor.id,
        action: "BUILD_ACTIVATED",
        entity: "game_build",
        entityId: buildId,
        ip,
    });
    return GameBuildRepository.findById(buildId);
};

export const deleteBuild = async (buildId: string, actor: { id: string; role: Role }) => {
    const build = await GameBuildRepository.findById(buildId);
    if (!build) throw AppError.notFound("Build not found");
    await loadOwnedGame(build.gameId, actor);
    await GameBuildRepository.deleteById(buildId);
};

// ---------------------------------------------------------------------------
// Media
// ---------------------------------------------------------------------------
export const listMedia = async (gameId: string, actor?: { id: string; role: Role }) => {
    if (actor) await loadOwnedGame(gameId, actor);
    return GameMediaRepository.listByGame(gameId);
};

export const addMedia = async (
    gameId: string,
    actor: { id: string; role: Role },
    body: { type: MediaType; url: string; sortOrder?: number },
    ip?: string,
) => {
    await loadOwnedGame(gameId, actor);
    if (!MEDIA_TYPES.includes(body.type)) throw AppError.badRequest("Invalid media type");

    return sequelize.transaction(async (t) => {
        // "Exactly one cover": adding a cover replaces the previous one.
        if (body.type === MediaType.COVER) {
            const existing = await GameMediaRepository.findCover(gameId);
            if (existing) await GameMediaRepository.deleteById(existing.id, t);
        }
        const media = await GameMediaRepository.create(
            {
                gameId,
                type: body.type,
                url: body.url,
                sortOrder: body.sortOrder ?? 0,
            },
            t,
        );
        await audit({
            actorId: actor.id,
            action: "GAME_MEDIA_ADDED",
            entity: "game_media",
            entityId: media.id,
            diff: { type: body.type },
            ip,
        });
        return media;
    });
};

export const deleteMedia = async (mediaId: string, actor: { id: string; role: Role }) => {
    const media = await GameMediaRepository.findById(mediaId);
    if (!media) throw AppError.notFound("Media not found");
    await loadOwnedGame(media.gameId, actor);
    await GameMediaRepository.deleteById(mediaId);
};

export const reorderMedia = async (
    mediaId: string,
    actor: { id: string; role: Role },
    sortOrder: number,
) => {
    const media = await GameMediaRepository.findById(mediaId);
    if (!media) throw AppError.notFound("Media not found");
    await loadOwnedGame(media.gameId, actor);
    await GameMediaRepository.updateById(mediaId, { sortOrder });
    return GameMediaRepository.findById(mediaId);
};

// ---------------------------------------------------------------------------
// System requirements & taxonomy
// ---------------------------------------------------------------------------
export const getRequirements = async (gameId: string) =>
    SystemRequirementRepository.listByGame(gameId);

export const setRequirements = async (
    gameId: string,
    actor: { id: string; role: Role },
    body: {
        min?: { os: string; cpu: string; gpu: string; ramGb: number; storageGb: number; directx?: string };
        rec?: { os: string; cpu: string; gpu: string; ramGb: number; storageGb: number; directx?: string };
    },
    ip?: string,
) => {
    await loadOwnedGame(gameId, actor);

    // REC >= MIN on RAM and storage (spec rule), whether one or both rows are
    // being written right now.
    if (body.min && body.rec) {
        if (body.rec.ramGb < body.min.ramGb || body.rec.storageGb < body.min.storageGb) {
            throw AppError.badRequest("REC must be >= MIN on RAM and storage");
        }
    } else if (body.rec && !body.min) {
        const existingMin = await SystemRequirementRepository.findByGameAndType(gameId, "MIN");
        if (existingMin && (body.rec.ramGb < existingMin.ramGb || body.rec.storageGb < existingMin.storageGb)) {
            throw AppError.badRequest("REC must be >= MIN on RAM and storage");
        }
    } else if (body.min && !body.rec) {
        const existingRec = await SystemRequirementRepository.findByGameAndType(gameId, "REC");
        if (existingRec && (existingRec.ramGb < body.min.ramGb || existingRec.storageGb < body.min.storageGb)) {
            throw AppError.badRequest("REC must be >= MIN on RAM and storage");
        }
    }

    const result: unknown[] = [];
    if (body.min) {
        result.push(
            await SystemRequirementRepository.upsert({
                gameId,
                type: "MIN" as never,
                os: body.min.os,
                cpu: body.min.cpu,
                gpu: body.min.gpu,
                ramGb: body.min.ramGb,
                storageGb: body.min.storageGb,
                directx: body.min.directx ?? null,
            }),
        );
    }
    if (body.rec) {
        result.push(
            await SystemRequirementRepository.upsert({
                gameId,
                type: "REC" as never,
                os: body.rec.os,
                cpu: body.rec.cpu,
                gpu: body.rec.gpu,
                ramGb: body.rec.ramGb,
                storageGb: body.rec.storageGb,
                directx: body.rec.directx ?? null,
            }),
        );
    }
    void ip;
    void SYSTEM_REQUIREMENT_TYPES;
    return result;
};

export const setTaxonomy = async (
    gameId: string,
    actor: { id: string; role: Role },
    body: { genreIds?: string[]; tagIds?: string[] },
) => {
    await loadOwnedGame(gameId, actor);
    await sequelize.transaction(async (t) => {
        if (body.genreIds) {
            const genres = await GenreRepository.findByIds(body.genreIds);
            if (genres.length !== body.genreIds.length) {
                throw AppError.badRequest("Unknown genre id");
            }
            await GameTaxonomyRepository.setGenres(gameId, body.genreIds, t);
        }
        if (body.tagIds) {
            const tags = await TagRepository.findByIds(body.tagIds);
            if (tags.length !== body.tagIds.length) {
                throw AppError.badRequest("Unknown tag id");
            }
            await GameTaxonomyRepository.setTags(gameId, body.tagIds, t);
        }
    });
    return {
        genreIds: await GameTaxonomyRepository.getGenreIds(gameId),
        tagIds: await GameTaxonomyRepository.getTagIds(gameId),
    };
};

// ---------------------------------------------------------------------------
// Browse & detail
// ---------------------------------------------------------------------------
export const searchPublic = async (filters: {
    q?: string;
    genreSlug?: string;
    tagSlug?: string;
    priceMinPaisa?: number;
    priceMaxPaisa?: number;
    minRecommendRatio?: number;
    releaseFrom?: string;
    releaseTo?: string;
    publisherId?: string;
    sort?: "relevance" | "newest" | "price_asc" | "price_desc" | "top_rated" | "trending";
    page: number;
    pageSize: number;
}) => {
    const { rows, count } = await GameRepository.search({
        ...filters,
        limit: filters.pageSize,
        offset: (filters.page - 1) * filters.pageSize,
    });
    return {
        games: rows.map((r) => ({
            id: r.id,
            title: r.title,
            slug: r.slug,
            shortDesc: r.short_desc,
            ageRating: r.age_rating,
            basePricePaisa: Number(r.base_price_paisa),
            releaseDate: r.release_date,
            isEarlyAccess: r.is_early_access,
            publisherName: r.publisher_name,
            coverUrl: r.cover_url,
            reviewCount: r.review_count,
            recommendRatio: r.recommend_ratio,
            trendingScore: Math.round((r.sales_14d * 0.6 + r.wishlist_count * 0.4) * 100) / 100,
        })),
        total: count,
        page: filters.page,
        pageSize: filters.pageSize,
    };
};

export const listMine = async (
    publisherId: string,
    filters: { status?: GameStatus; page: number; pageSize: number },
) => {
    const { rows, count } = await GameRepository.listForPublisher(publisherId, {
        status: filters.status,
        limit: filters.pageSize,
        offset: (filters.page - 1) * filters.pageSize,
    });
    return { games: rows, total: count, page: filters.page, pageSize: filters.pageSize };
};

export const getPublicDetail = async (slug: string, viewer?: { id: string; role: Role }) => {
    const detail = await GameRepository.findDetailBySlug(slug);
    if (!detail) throw AppError.notFound("Game not found");

    const isOwner =
        viewer &&
        (await (async () => {
            const publisher = await PublisherRepository.findByOwnerUserId(viewer.id);
            return publisher?.id === detail.game.publisherId;
        })());
    const privileged = viewer?.role === Role.ADMIN || isOwner;

    if (!privileged && !CUSTOMER_VISIBLE_GAME_STATUSES.includes(detail.game.status)) {
        throw AppError.notFound("Game not found");
    }

    const media = await GameMediaRepository.listByGame(detail.game.id);
    const builds = await GameBuildRepository.listByGame(detail.game.id);
    const price = await priceSummaryForGame(detail.game.id);

    return {
        game: detail.game,
        publisher: detail.publisher,
        genres: detail.genres,
        tags: detail.tags,
        systemRequirements: detail.requirements,
        media,
        // cdn_url is deliberately not exposed: downloads go through the
        // license check and short-lived signed URLs only.
        builds: privileged
            ? builds
            : builds.filter((b) => b.isActive).map((b) => ({
                  id: b.id,
                  version: b.version,
                  platform: b.platform,
                  fileSizeBytes: b.fileSizeBytes,
                  checksumSha256: b.checksumSha256,
              })),
        price,
    };
};

export { GAME_STATUSES, AGE_RATINGS, Transaction as _Transaction };
