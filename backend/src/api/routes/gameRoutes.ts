import { Router } from "express";

import * as gameControllers from "../controllers/gameControllers";
import {
    authenticate,
    optionalAuth,
    requireAction,
    requireRole,
    validate,
} from "../../middleware";
import { Action } from "../../services/accessControl";
import {
    buildSchema,
    createGameSchema,
    genreSchema,
    listMineQuerySchema,
    mediaSchema,
    reorderMediaSchema,
    requirementsSchema,
    searchQuerySchema,
    tagSchema,
    taxonomySchema,
    updateGameSchema,
} from "../../validators";

const gameRoutes = Router();

// ---------------------------------------------------------------------------
// Public catalog. Literal paths ("/genres", "/tags", "/mine") must be declared
// before "/:slug" or Express would swallow them as a slug.
// ---------------------------------------------------------------------------
gameRoutes.get("/genres", gameControllers.listGenres);
gameRoutes.get("/tags", gameControllers.listTags);
gameRoutes.get("/", validate(searchQuerySchema, "query"), gameControllers.search);

// Publisher catalog management. Ownership (and verified-publisher rules) is
// asserted inside the services; the route only fixes the coarse role/actions.
// Declared before "/:slug" — otherwise /games/mine would match the slug
// route and 404 as "Game not found".
gameRoutes.get(
    "/mine",
    authenticate,
    requireAction(Action.PUBLISHER_MANAGE),
    validate(listMineQuerySchema, "query"),
    gameControllers.listMine,
);

// Personalized detail (wishlisted / owned badges) — anonymous visitors just
// get the public view, so the token is optional rather than required.
gameRoutes.get("/:slug", optionalAuth, gameControllers.detail);

gameRoutes.post(
    "/",
    authenticate,
    requireAction(Action.GAME_CREATE),
    validate(createGameSchema),
    gameControllers.createGame,
);

gameRoutes.patch(
    "/:id",
    authenticate,
    requireAction(Action.PUBLISHER_MANAGE),
    validate(updateGameSchema),
    gameControllers.updateGame,
);

gameRoutes.delete(
    "/:id",
    authenticate,
    requireAction(Action.PUBLISHER_MANAGE),
    gameControllers.deleteGame,
);

gameRoutes.post(
    "/:id/submit",
    authenticate,
    requireAction(Action.PUBLISHER_MANAGE),
    gameControllers.submitGame,
);

gameRoutes.post(
    "/:id/withdraw",
    authenticate,
    requireAction(Action.PUBLISHER_MANAGE),
    gameControllers.withdrawGame,
);

// System requirements are part of the public store page.
gameRoutes.get("/:id/requirements", gameControllers.getRequirements);
gameRoutes.put(
    "/:id/requirements",
    authenticate,
    requireAction(Action.PUBLISHER_MANAGE),
    validate(requirementsSchema),
    gameControllers.setRequirements,
);

gameRoutes.patch(
    "/:id/taxonomy",
    authenticate,
    requireAction(Action.PUBLISHER_MANAGE),
    validate(taxonomySchema),
    gameControllers.setTaxonomy,
);

// ---------------------------------------------------------------------------
// Builds — the shipped binaries behind each platform.
// ---------------------------------------------------------------------------
gameRoutes.get(
    "/:id/builds",
    authenticate,
    requireAction(Action.PUBLISHER_MANAGE),
    gameControllers.listBuilds,
);

gameRoutes.post(
    "/:id/builds",
    authenticate,
    requireAction(Action.PUBLISHER_MANAGE),
    validate(buildSchema),
    gameControllers.addBuild,
);

gameRoutes.post(
    "/:id/builds/:buildId/activate",
    authenticate,
    requireAction(Action.PUBLISHER_MANAGE),
    gameControllers.activateBuild,
);

gameRoutes.delete(
    "/:id/builds/:buildId",
    authenticate,
    requireAction(Action.PUBLISHER_MANAGE),
    gameControllers.deleteBuild,
);

// ---------------------------------------------------------------------------
// Media (screenshots, trailers).
// ---------------------------------------------------------------------------
gameRoutes.post(
    "/:id/media",
    authenticate,
    requireAction(Action.PUBLISHER_MANAGE),
    validate(mediaSchema),
    gameControllers.addMedia,
);

gameRoutes.delete(
    "/:id/media/:mediaId",
    authenticate,
    requireAction(Action.PUBLISHER_MANAGE),
    gameControllers.deleteMedia,
);

gameRoutes.patch(
    "/:id/media/:mediaId/reorder",
    authenticate,
    requireAction(Action.PUBLISHER_MANAGE),
    validate(reorderMediaSchema),
    gameControllers.reorderMedia,
);

// ---------------------------------------------------------------------------
// Admin moderation (approve → publish, reject, delist, relist).
// ---------------------------------------------------------------------------
gameRoutes.post(
    "/:id/approve",
    authenticate,
    requireAction(Action.GAME_MODERATE),
    gameControllers.approveGame,
);
gameRoutes.post(
    "/:id/reject",
    authenticate,
    requireAction(Action.GAME_MODERATE),
    gameControllers.rejectGame,
);
gameRoutes.post(
    "/:id/delist",
    authenticate,
    requireAction(Action.GAME_MODERATE),
    gameControllers.delistGame,
);
gameRoutes.post(
    "/:id/relist",
    authenticate,
    requireAction(Action.GAME_MODERATE),
    gameControllers.relistGame,
);

// ---------------------------------------------------------------------------
// Admin taxonomy management (genres / tags are shared catalog data).
// ---------------------------------------------------------------------------
gameRoutes.post(
    "/genres",
    authenticate,
    requireAction(Action.GENRE_TAG_MANAGE),
    validate(genreSchema),
    gameControllers.createGenre,
);

gameRoutes.delete(
    "/genres/:id",
    authenticate,
    requireAction(Action.GENRE_TAG_MANAGE),
    gameControllers.deleteGenre,
);

gameRoutes.post(
    "/tags",
    authenticate,
    requireAction(Action.GENRE_TAG_MANAGE),
    validate(tagSchema),
    gameControllers.createTag,
);

gameRoutes.delete(
    "/tags/:id",
    authenticate,
    requireAction(Action.GENRE_TAG_MANAGE),
    gameControllers.deleteTag,
);

export default gameRoutes;
