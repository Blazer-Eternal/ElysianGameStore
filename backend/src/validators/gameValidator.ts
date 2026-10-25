import { z } from "zod";

import { AGE_RATINGS } from "../enums/ageRatingEnum";
import { MEDIA_TYPES } from "../enums/mediaTypeEnum";
import { PLATFORMS } from "../enums/platformEnum";
import { GAME_STATUSES } from "../enums/gameStatusEnum";
import { pageQuerySchema, paisaSchema } from "./helpers";

export const createGameSchema = z.object({
    title: z.string().min(3).max(160),
    shortDesc: z.string().min(10).max(500),
    longDesc: z.string().max(20000).optional(),
    releaseDate: z.coerce.date().optional(),
    ageRating: z.enum(AGE_RATINGS as [string, ...string[]]).optional(),
    basePricePaisa: paisaSchema.optional(),
    isEarlyAccess: z.boolean().optional(),
});

export const updateGameSchema = z
    .object({
        title: z.string().min(3).max(160).optional(),
        shortDesc: z.string().min(10).max(500).optional(),
        longDesc: z.string().max(20000).nullable().optional(),
        releaseDate: z.coerce.date().nullable().optional(),
        ageRating: z.enum(AGE_RATINGS as [string, ...string[]]).optional(),
        basePricePaisa: paisaSchema.optional(),
        isEarlyAccess: z.boolean().optional(),
    })
    .refine((v) => Object.keys(v).length > 0, { message: "Nothing to update" });

export const searchQuerySchema = pageQuerySchema.extend({
    q: z.string().max(200).optional(),
    genre: z.string().max(80).optional(),
    tag: z.string().max(80).optional(),
    priceMin: z.coerce.number().int().min(0).optional(),
    priceMax: z.coerce.number().int().min(0).optional(),
    minRating: z.coerce.number().min(0).max(1).optional(),
    releaseFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    releaseTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    sort: z
        .enum(["relevance", "newest", "price_asc", "price_desc", "top_rated", "trending"])
        .default("newest"),
});

export const listMineQuerySchema = pageQuerySchema.extend({
    status: z.enum(GAME_STATUSES as [string, ...string[]]).optional(),
});

export const buildSchema = z.object({
    version: z.string().regex(/^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/, "version must be semver"),
    platform: z.enum(PLATFORMS as [string, ...string[]]),
    fileSizeBytes: z.number().int().positive(),
    checksumSha256: z.string().regex(/^[a-fA-F0-9]{64}$/, "sha256 checksum required"),
    cdnUrl: z.url(),
    changelog: z.string().max(20000).optional(),
    isActive: z.boolean().optional(),
});

export const mediaSchema = z.object({
    type: z.enum(MEDIA_TYPES as [string, ...string[]]),
    url: z.url(),
    sortOrder: z.number().int().min(0).max(1000).optional(),
});

export const requirementRowSchema = z.object({
    os: z.string().min(2).max(80),
    cpu: z.string().min(2).max(160),
    gpu: z.string().min(2).max(160),
    ramGb: z.number().int().min(1).max(1024),
    storageGb: z.number().int().min(1).max(10000),
    directx: z.string().max(20).optional(),
});

export const requirementsSchema = z
    .object({
        min: requirementRowSchema.optional(),
        rec: requirementRowSchema.optional(),
    })
    .refine((v) => v.min || v.rec, { message: "Provide min and/or rec" });

export const taxonomySchema = z
    .object({
        genreIds: z.array(z.uuid()).max(10).optional(),
        tagIds: z.array(z.uuid()).max(20).optional(),
    })
    .refine((v) => v.genreIds !== undefined || v.tagIds !== undefined, {
        message: "Provide genreIds and/or tagIds",
    });

export const reorderMediaSchema = z.object({
    sortOrder: z.number().int().min(0).max(1000),
});

export const genreSchema = z.object({ name: z.string().min(2).max(60) });
export const tagSchema = z.object({ name: z.string().min(2).max(60) });
