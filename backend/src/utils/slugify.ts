// URL-safe slug generator. Collisions are handled by the caller (suffix with
// a short random string when the slug already exists).
export const slugify = (input: string): string =>
    input
        .toString()
        .normalize("NFKD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/[\s_-]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 120) || "untitled";

export default slugify;
