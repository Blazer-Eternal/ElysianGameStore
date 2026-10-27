import { Suspense } from "react";

import { CatalogControls } from "@/features/catalog/CatalogControls";
import { Pagination } from "@/features/catalog/Pagination";
import { GameCard } from "@/components/commerce/GameCard";
import { EmptyState, Skeleton } from "@/components/ui/Marks";
import { ActionLink } from "@/features/home/ActionLink";
import { api, qs } from "@/lib/api";
import type { Genre, SearchResponse, Tag } from "@/types";

export const metadata = {
    title: "Store",
    description: "The full Elysian catalogue: PC games, prices in NPR with VAT included.",
};

type Search = Record<string, string | string[] | undefined>;

const first = (value: string | string[] | undefined): string =>
    Array.isArray(value) ? (value[0] ?? "") : (value ?? "");

export default async function GamesPage({ searchParams }: { searchParams: Promise<Search> }) {
    const sp = await searchParams;

    const q = first(sp.q);
    const genre = first(sp.genre);
    const tag = first(sp.tag);
    const sort = first(sp.sort) || "newest";
    const minRating = first(sp.minRating);
    const priceMin = first(sp.priceMin);
    const priceMax = first(sp.priceMax);
    const page = Math.max(1, Number(first(sp.page)) || 1);

    // Canonical query string: reused verbatim by Pagination for its links.
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries({
        q,
        genre,
        tag,
        sort: sort === "newest" ? "" : sort,
        minRating,
        priceMin,
        priceMax,
        page: page > 1 ? String(page) : "",
    })) {
        if (value) params.set(key, value);
    }

    const [search, genresRes, tagsRes] = await Promise.all([
        api.get<SearchResponse>(
            `/games${qs({
                q,
                genre,
                tag,
                sort,
                minRating,
                priceMin,
                priceMax,
                page,
                pageSize: 12,
            })}`,
        ),
        api.get<{ genres: Genre[] }>("/games/genres"),
        api.get<{ tags: Tag[] }>("/games/tags"),
    ]);

    const { games, total, pageSize } = search;
    const genres = genresRes.genres;
    const tags = tagsRes.tags;
    const activeGenre = genres.find((g) => g.slug === genre);

    const heading = q
        ? `Results for “${q}”`
        : activeGenre
          ? activeGenre.name
          : sort === "newest"
            ? "All games"
            : "Catalogue";

    return (
        <div className="mx-auto w-full max-w-[84rem] px-4 pb-16 sm:px-6 lg:px-10">
            {/* Masthead: kicker, title, count. No badge above the heading. */}
            <header className="pt-12 lg:pt-20">
                <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3 border-b border-line pb-5">
                    <div>
                        <p className="kicker text-fg-faint">
                            {activeGenre ? `Genre · ${activeGenre.slug}` : "Catalogue"}
                        </p>
                        <h1 className="display-expanded mt-3 text-2xl font-semibold">{heading}</h1>
                    </div>
                    <p className="figure text-sm text-fg-muted">
                        {total} {total === 1 ? "title" : "titles"}
                        {pageSize ? ` · page ${page}` : ""}
                    </p>
                </div>
            </header>

            <Suspense fallback={<Skeleton className="h-40 w-full" />}>
                <CatalogControls genres={genres} tags={tags} />
            </Suspense>

            {games.length === 0 ? (
                <EmptyState
                    kicker="No matches"
                    title="Nothing on the shelf for that search."
                    description="Try a broader term, drop a filter, or browse the full catalogue. The store carries only published titles."
                    action={<ActionLink href="/games">Clear filters</ActionLink>}
                />
            ) : (
                <>
                    <div className="mt-8 grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-4">
                        {games.map((game) => (
                            <GameCard key={game.id} game={game} />
                        ))}
                    </div>

                    <Pagination page={page} pageSize={pageSize} total={total} params={params} />
                </>
            )}
        </div>
    );
}
