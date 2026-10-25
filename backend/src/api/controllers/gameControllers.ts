import { Response } from "express";

import { AgeRating } from "../../enums/ageRatingEnum";
import { GameStatus } from "../../enums/gameStatusEnum";
import { MediaType } from "../../enums/mediaTypeEnum";
import { Platform } from "../../enums/platformEnum";
import { AppRequest as Request } from "../../interfaces";
import { asyncHandler } from "../../middleware/exceptionHandler";
import { actorOf } from "../../middleware/guard";
import { catalogServices, gameServices, publisherServices } from "../../services";
import { sendSuccess } from "../../utils/response";

// ---------------------------------------------------------------------------
// Public catalog
// ---------------------------------------------------------------------------
export const search = asyncHandler(async (req: Request, res: Response) => {
    const q = req.query as Record<string, string | number | undefined>;
    const result = await gameServices.searchPublic({
        q: q.q as string | undefined,
        genreSlug: q.genre as string | undefined,
        tagSlug: q.tag as string | undefined,
        priceMinPaisa: q.priceMin as number | undefined,
        priceMaxPaisa: q.priceMax as number | undefined,
        minRecommendRatio: q.minRating as number | undefined,
        releaseFrom: q.releaseFrom as string | undefined,
        releaseTo: q.releaseTo as string | undefined,
        sort: (q.sort as never) ?? "newest",
        page: Number(q.page ?? 1),
        pageSize: Number(q.pageSize ?? 12),
    });
    sendSuccess(res, result);
});

export const detail = asyncHandler(async (req: Request, res: Response) => {
    const viewer = req.user ? { id: req.user.sub, role: req.user.role as never } : undefined;
    const result = await gameServices.getPublicDetail(req.params.slug, viewer);
    sendSuccess(res, result);
});

export const listGenres = asyncHandler(async (_req: Request, res: Response) => {
    sendSuccess(res, { genres: await catalogServices.listGenres() });
});

export const listTags = asyncHandler(async (_req: Request, res: Response) => {
    sendSuccess(res, { tags: await catalogServices.listTags() });
});

// ---------------------------------------------------------------------------
// Publisher catalog management
// ---------------------------------------------------------------------------
export const listMine = asyncHandler(async (req: Request, res: Response) => {
    const actor = actorOf(req);
    const publisher = await publisherServices.requireOwnedPublisher(actor.id);
    const q = req.query as Record<string, string | undefined>;
    const result = await gameServices.listMine(publisher.id, {
        status: q.status as GameStatus | undefined,
        page: Number(q.page ?? 1),
        pageSize: Number(q.pageSize ?? 12),
    });
    sendSuccess(res, result);
});

export const createGame = asyncHandler(async (req: Request, res: Response) => {
    const game = await gameServices.create(actorOf(req), req.body, req.ip);
    sendSuccess(res, { game }, "Game created", 201);
});

export const updateGame = asyncHandler(async (req: Request, res: Response) => {
    const game = await gameServices.update(req.params.id, actorOf(req), req.body, req.ip);
    sendSuccess(res, { game }, "Game updated");
});

export const deleteGame = asyncHandler(async (req: Request, res: Response) => {
    await gameServices.remove(req.params.id, actorOf(req));
    sendSuccess(res, null, "Game deleted");
});

export const submitGame = asyncHandler(async (req: Request, res: Response) => {
    const game = await gameServices.submit(req.params.id, actorOf(req), req.ip);
    sendSuccess(res, { game }, "Submitted for review");
});

export const withdrawGame = asyncHandler(async (req: Request, res: Response) => {
    const game = await gameServices.withdraw(req.params.id, actorOf(req));
    sendSuccess(res, { game }, "Withdrawn from review");
});

// ---------------------------------------------------------------------------
// Builds
// ---------------------------------------------------------------------------
export const listBuilds = asyncHandler(async (req: Request, res: Response) => {
    const builds = await gameServices.listBuilds(req.params.id, actorOf(req));
    sendSuccess(res, { builds });
});

export const addBuild = asyncHandler(async (req: Request, res: Response) => {
    const build = await gameServices.addBuild(
        req.params.id,
        actorOf(req),
        { ...req.body, platform: req.body.platform as Platform },
        req.ip,
    );
    sendSuccess(res, { build }, "Build added", 201);
});

export const activateBuild = asyncHandler(async (req: Request, res: Response) => {
    const build = await gameServices.activateBuild(req.params.buildId, actorOf(req), req.ip);
    sendSuccess(res, { build }, "Build activated");
});

export const deleteBuild = asyncHandler(async (req: Request, res: Response) => {
    await gameServices.deleteBuild(req.params.buildId, actorOf(req));
    sendSuccess(res, null, "Build deleted");
});

// ---------------------------------------------------------------------------
// Media
// ---------------------------------------------------------------------------
export const addMedia = asyncHandler(async (req: Request, res: Response) => {
    const media = await gameServices.addMedia(
        req.params.id,
        actorOf(req),
        { ...req.body, type: req.body.type as MediaType },
        req.ip,
    );
    sendSuccess(res, { media }, "Media added", 201);
});

export const deleteMedia = asyncHandler(async (req: Request, res: Response) => {
    await gameServices.deleteMedia(req.params.mediaId, actorOf(req));
    sendSuccess(res, null, "Media deleted");
});

export const reorderMedia = asyncHandler(async (req: Request, res: Response) => {
    const media = await gameServices.reorderMedia(
        req.params.mediaId,
        actorOf(req),
        req.body.sortOrder,
    );
    sendSuccess(res, { media });
});

// ---------------------------------------------------------------------------
// Requirements & taxonomy
// ---------------------------------------------------------------------------
export const getRequirements = asyncHandler(async (req: Request, res: Response) => {
    const requirements = await gameServices.getRequirements(req.params.id);
    sendSuccess(res, { requirements });
});

export const setRequirements = asyncHandler(async (req: Request, res: Response) => {
    const requirements = await gameServices.setRequirements(req.params.id, actorOf(req), req.body, req.ip);
    sendSuccess(res, { requirements }, "Requirements saved");
});

export const setTaxonomy = asyncHandler(async (req: Request, res: Response) => {
    const result = await gameServices.setTaxonomy(req.params.id, actorOf(req), req.body);
    sendSuccess(res, result, "Taxonomy updated");
});

// ---------------------------------------------------------------------------
// Admin moderation
// ---------------------------------------------------------------------------
export const approveGame = asyncHandler(async (req: Request, res: Response) => {
    const game = await gameServices.adminApprove(req.params.id, req.user!.sub, req.ip);
    sendSuccess(res, { game }, "Game approved and published");
});

export const rejectGame = asyncHandler(async (req: Request, res: Response) => {
    const game = await gameServices.adminReject(req.params.id, req.user!.sub, req.ip);
    sendSuccess(res, { game }, "Game rejected");
});

export const delistGame = asyncHandler(async (req: Request, res: Response) => {
    const game = await gameServices.adminDelist(req.params.id, req.user!.sub, req.ip);
    sendSuccess(res, { game }, "Game delisted");
});

export const relistGame = asyncHandler(async (req: Request, res: Response) => {
    const game = await gameServices.adminRelist(req.params.id, req.user!.sub, req.ip);
    sendSuccess(res, { game }, "Game re-listed");
});

// ---------------------------------------------------------------------------
// Taxonomy admin
// ---------------------------------------------------------------------------
export const createGenre = asyncHandler(async (req: Request, res: Response) => {
    const genre = await catalogServices.createGenre(req.body.name, req.user!.sub, req.ip);
    sendSuccess(res, { genre }, "Genre created", 201);
});

export const deleteGenre = asyncHandler(async (req: Request, res: Response) => {
    await catalogServices.deleteGenre(req.params.id, req.user!.sub, req.ip);
    sendSuccess(res, null, "Genre deleted");
});

export const createTag = asyncHandler(async (req: Request, res: Response) => {
    const tag = await catalogServices.createTag(req.body.name, req.user!.sub, req.ip);
    sendSuccess(res, { tag }, "Tag created", 201);
});

export const deleteTag = asyncHandler(async (req: Request, res: Response) => {
    await catalogServices.deleteTag(req.params.id, req.user!.sub, req.ip);
    sendSuccess(res, null, "Tag deleted");
});

export { AgeRating };
