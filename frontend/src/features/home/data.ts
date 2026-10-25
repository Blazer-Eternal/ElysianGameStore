import { cache } from "react";

import { api, qs } from "@/lib/api";
import type { GameDetail, GameSummary, Genre, SearchResponse } from "@/types";

// Server-side reads for the landing page. Each accessor is memoized per
// render pass, so sections that ask for the same list (hero + ranking)
// share one request. All of it is public catalog data: no cookies, no
// user context (see lib/api.ts).
//
// Every caller lives inside a <Suspense> boundary in app/(public)/page.tsx,
// because cacheComponents treats these awaits as uncached data.

export const getTrending = cache((pageSize = 12): Promise<SearchResponse> =>
    api.get<SearchResponse>(`/games${qs({ sort: "trending", page: 1, pageSize })}`),
);

export const getNewest = cache((pageSize = 8): Promise<SearchResponse> =>
    api.get<SearchResponse>(`/games${qs({ sort: "newest", page: 1, pageSize })}`),
);

export const getGenres = cache((): Promise<{ genres: Genre[] }> =>
    api.get<{ genres: Genre[] }>("/games/genres"),
);

/** Detail adds live promo pricing + genre links for the featured title. */
export const getGameDetail = cache((slug: string): Promise<GameDetail> =>
    api.get<GameDetail>(`/games/${slug}`),
);

/** Highest trendingScore in the fetched page, not just list order. */
export const pickFeatured = (games: GameSummary[]): GameSummary | null =>
    games.reduce<GameSummary | null>(
        (best, game) => (best === null || game.trendingScore > best.trendingScore ? game : best),
        null,
    );
