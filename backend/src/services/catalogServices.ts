import { GenreRepository, TagRepository } from "../repositories";
import AppError from "../utils/appError";
import { slugify } from "../utils";
import { audit, AUDIT_ACTIONS } from "./auditServices";

// Admin-controlled taxonomy: genres are a fixed curated list, tags are more
// freely added. Both M:N with games via game_genres / game_tags.
export const listGenres = async () => GenreRepository.listAll();

export const listTags = async () => TagRepository.listAll();

export const createGenre = async (name: string, adminId: string, ip?: string) => {
    const slug = slugify(name);
    if (await GenreRepository.findBySlug(slug)) {
        throw AppError.conflict("A genre with this name already exists");
    }
    const genre = await GenreRepository.create({ name, slug });
    await audit({
        actorId: adminId,
        action: "GENRE_CREATED",
        entity: "genre",
        entityId: genre.id,
        diff: { name, slug },
        ip,
    });
    return genre;
};

export const deleteGenre = async (id: string, adminId: string, ip?: string) => {
    const genre = await GenreRepository.findById(id);
    if (!genre) throw AppError.notFound("Genre not found");
    await GenreRepository.deleteById(id);
    await audit({
        actorId: adminId,
        action: "GENRE_DELETED",
        entity: "genre",
        entityId: id,
        ip,
    });
};

export const createTag = async (name: string, adminId: string, ip?: string) => {
    const slug = slugify(name);
    if (await TagRepository.findBySlug(slug)) {
        throw AppError.conflict("A tag with this name already exists");
    }
    const tag = await TagRepository.create({ name, slug });
    await audit({
        actorId: adminId,
        action: "TAG_CREATED",
        entity: "tag",
        entityId: tag.id,
        diff: { name, slug },
        ip,
    });
    return tag;
};

export const deleteTag = async (id: string, adminId: string, ip?: string) => {
    const tag = await TagRepository.findById(id);
    if (!tag) throw AppError.notFound("Tag not found");
    await TagRepository.deleteById(id);
    await audit({
        actorId: adminId,
        action: "TAG_DELETED",
        entity: "tag",
        entityId: id,
        ip,
    });
};
