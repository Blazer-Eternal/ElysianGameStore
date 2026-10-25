"use client";

import { useState } from "react";

import { AGE_RATING_LABELS } from "@/constants/nav";
import type { AgeRating } from "@/types";

// Game artwork in this environment points at a placeholder CDN, so the
// component is built around a designed fallback rather than fighting it:
// a typographic cover (oversized letterform + hairline frame + title block)
// chosen deterministically from the slug, so a title always looks the same.
// When real artwork exists, the image simply wins and the fallback never
// renders. No gradients, no blur — solid stock only (DESIGN.md).

type Layout = 0 | 1 | 2 | 3;

const layoutFor = (seed: string): Layout => {
    let hash = 0;
    for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
    return (hash % 4) as Layout;
};

function TypographicCover({ title, slug, rating }: { title: string; slug: string; rating?: AgeRating }) {
    const layout = layoutFor(slug || title);
    const letter = (title.trim()[0] ?? "E").toUpperCase();

    return (
        <div className="absolute inset-0 flex flex-col justify-between overflow-hidden bg-surface-2 p-3 sm:p-4">
            {/* Hairline structure differs per layout: same system, four cuts */}
            {layout === 0 ? (
                <div className="absolute inset-y-0 left-1/3 w-px bg-line" aria-hidden />
            ) : layout === 1 ? (
                <div className="absolute inset-x-0 top-1/2 h-px bg-line" aria-hidden />
            ) : layout === 2 ? (
                <>
                    <div className="absolute inset-y-0 left-1/2 w-px bg-line" aria-hidden />
                    <div className="absolute inset-x-0 top-2/3 h-px bg-line" aria-hidden />
                </>
            ) : (
                <div className="absolute inset-x-6 top-1/2 h-px bg-line" aria-hidden />
            )}

            <div className="relative flex items-start justify-between">
                <span
                    aria-hidden
                    className="display-expanded font-bold leading-none text-fg-faint"
                    style={{ fontSize: "clamp(3rem, 6vw, 5rem)" }}
                >
                    {letter}
                </span>
                {rating ? (
                    <span className="figure border border-line-strong px-1.5 py-0.5 text-[0.625rem] leading-none text-fg-muted">
                        {rating}
                    </span>
                ) : null}
            </div>

            <div className="relative">
                <p className="line-clamp-2 text-sm font-semibold uppercase leading-tight tracking-tight text-fg sm:text-base">
                    {title}
                </p>
                <p className="kicker mt-1.5 text-fg-faint">PC · Digital</p>
            </div>
        </div>
    );
}

export function GameCover({
    title,
    slug,
    coverUrl,
    rating,
    className = "",
    sizes = "(max-width: 640px) 100vw, 33vw",
}: {
    title: string;
    slug: string;
    coverUrl?: string | null;
    rating?: AgeRating;
    className?: string;
    sizes?: string;
}) {
    const [failed, setFailed] = useState(false);
    const usable = Boolean(coverUrl) && !failed && !coverUrl?.includes("elysian.example");

    return (
        <div
            className={`relative aspect-[16/10] w-full overflow-hidden bg-surface-2 ${className}`}
            role="img"
            aria-label={`${title} cover`}
        >
            {usable ? (
                // Placeholder domains are filtered above; real artwork uses a
                // plain img (no remotePatterns config needed for dev assets).
                <img
                    src={coverUrl!}
                    alt=""
                    sizes={sizes}
                    loading="lazy"
                    onError={() => setFailed(true)}
                    className="absolute inset-0 h-full w-full object-cover"
                />
            ) : (
                <TypographicCover title={title} slug={slug} rating={rating} />
            )}
        </div>
    );
}

/** Rating shown as a figure, not five decorative stars. */
export function RatingFigure({
    ratio,
    count,
}: {
    ratio: number | null;
    count: number;
}) {
    if (count === 0 || ratio === null) {
        return <span className="figure text-xs text-fg-faint">No ratings yet</span>;
    }
    const percent = Math.round(ratio * 100);
    return (
        <span className="figure text-xs text-fg-muted">
            {percent}% positive · {count} {count === 1 ? "review" : "reviews"}
        </span>
    );
}
