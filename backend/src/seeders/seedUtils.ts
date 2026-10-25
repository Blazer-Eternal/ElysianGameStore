import { createHash } from "crypto";

// ---------------------------------------------------------------------------
// Shared seeder utilities.
//
// seedUuid derives a stable UUID v5 (SHA-1, RFC 4122) from a namespace plus a
// human-readable name. Every demo row that has no natural unique key (orders,
// payments, refunds, media rows, notifications …) gets its primary key from
// here, which turns "is it seeded?" into a plain findOrCreate({ where: { id } })
// — re-running never duplicates and a partial run resumes exactly where it
// stopped.
// ---------------------------------------------------------------------------

// Fixed namespace (RFC 4122 URL namespace) — never change once seeded data
// exists in the wild, or every id would shift underneath the database.
const SEED_NAMESPACE = Buffer.from("6ba7b8109dad11d180b400c04fd430c8", "hex");

export const seedUuid = (name: string): string => {
    const hash = createHash("sha1")
        .update(SEED_NAMESPACE)
        .update(Buffer.from(name, "utf8"))
        .digest();

    const bytes = Array.from(hash.slice(0, 16));
    bytes[6] = (bytes[6] & 0x0f) | 0x50; // version 5
    bytes[8] = (bytes[8] & 0x3f) | 0x80; // RFC 4122 variant
    const hex = bytes.map((b) => b.toString(16).padStart(2, "0")).join("");

    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};

// 64-char hex, same shape as game_builds.checksum_sha256 / game_keys.key_hash.
export const sha256Hex = (input: string): string =>
    createHash("sha256").update(input).digest("hex");

// One fixed seed for the whole demo dataset — every faker-generated string
// (descriptions, review bodies) is byte-identical on every run.
export const FAKER_SEED = 12345;

// Deterministic small integer from a string (stable pseudo-hash, no floats).
export const hashInt = (input: string): number => {
    const hex = sha256Hex(input).slice(0, 8);
    return parseInt(hex, 16);
};

// Rows actually inserted by `INSERT ... ON CONFLICT DO NOTHING`.
// Sequelize's pg dialect returns the affected-row count as the raw metadata
// element (a plain number) for statements without RETURNING — some versions
// return an object with rowCount, so handle both shapes.
export const insertedCount = (metadata: unknown): number => {
    if (typeof metadata === "number") return metadata;
    const rowCount = (metadata as { rowCount?: number } | undefined)?.rowCount;
    return typeof rowCount === "number" ? rowCount : 0;
};
