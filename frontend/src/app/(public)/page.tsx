import { Suspense } from "react";

import {
    AssuranceBand,
    ClosingCta,
    GenreStrip,
    GenreStripSkeleton,
    NewReleases,
    NewReleasesSkeleton,
    TrendingRanking,
    TrendingRankingSkeleton,
} from "@/features/home/Sections";
import { Hero, HeroSkeleton } from "@/features/home/Hero";
import { Ticker, TickerSkeleton } from "@/features/home/Ticker";

// Editorial front page. Every section that reads the API sits behind its own
// Suspense boundary (cacheComponents treats those awaits as uncached data),
// so the page streams: structure first, data as it lands. Skeletons are flat
// blocks shaped like the section, never shimmer (DESIGN.md).

export default function HomePage() {
    return (
        <>
            <Suspense fallback={<HeroSkeleton />}>
                <Hero />
            </Suspense>

            <Suspense fallback={<TickerSkeleton />}>
                <Ticker />
            </Suspense>

            <Suspense fallback={<NewReleasesSkeleton />}>
                <NewReleases />
            </Suspense>

            <Suspense fallback={<TrendingRankingSkeleton />}>
                <TrendingRanking />
            </Suspense>

            <Suspense fallback={<GenreStripSkeleton />}>
                <GenreStrip />
            </Suspense>

            <AssuranceBand />
            <ClosingCta />
        </>
    );
}
