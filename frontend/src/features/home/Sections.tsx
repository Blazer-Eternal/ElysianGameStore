import Link from "next/link";

import { ActionLink } from "@/features/home/ActionLink";
import { getGenres, getNewest, getTrending } from "@/features/home/data";
import { GameCard } from "@/components/commerce/GameCard";
import { GameCover } from "@/components/commerce/GameCover";
import { Skeleton } from "@/components/ui/Marks";
import { PAYMENT_PROVIDERS } from "@/constants/nav";
import { paisaToNpr } from "@/lib/money";
import type { SearchResponse } from "@/types";

const CONTAINER = "mx-auto w-full max-w-[84rem] px-4 sm:px-6 lg:px-10";

const ruleHead = (kicker: string, title: string, note?: string) => (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-x-8 gap-y-3 border-b border-line pb-4">
        <div>
            <p className="kicker text-fg-faint">{kicker}</p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight">{title}</h2>
        </div>
        {note ? <p className="text-xs text-fg-faint">{note}</p> : null}
    </div>
);

/* ---------------------------------------------------- new releases grid */

export async function NewReleases() {
    const { games, total } = await getNewest(8);

    if (games.length === 0) return null;

    return (
        <section aria-labelledby="new-releases" className={`${CONTAINER} py-16 lg:py-26`}>
            <div id="new-releases">
                {ruleHead("Fresh on the shelf", "New releases", `${total} titles live`)}
            </div>

            <div className="grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-4">
                {games.map((game) => (
                    <GameCard key={game.id} game={game} />
                ))}
            </div>

            <div className="mt-10 border-t border-line pt-6">
                <ActionLink href="/games?sort=newest" variant="secondary">
                    All new releases
                </ActionLink>
            </div>
        </section>
    );
}

export function NewReleasesSkeleton() {
    return (
        <section aria-busy className={`${CONTAINER} py-16 lg:py-26`}>
            <Skeleton className="h-3 w-40" />
            <Skeleton className="mt-3 h-7 w-56" />
            <div className="mt-8 grid grid-cols-2 gap-6 lg:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i}>
                        <Skeleton className="aspect-[16/10] w-full" />
                        <Skeleton className="mt-3 h-4 w-3/4" />
                        <Skeleton className="mt-2 h-3 w-1/2" />
                    </div>
                ))}
            </div>
        </section>
    );
}

/* -------------------------------------------- numbered ranking, editorial */

function RankRow({
    index,
    game,
}: {
    index: number;
    game: SearchResponse["games"][number];
}) {
    return (
        <li className="group border-t border-line last:border-b">
            <Link
                href={`/games/${game.slug}`}
                className="flex items-center gap-4 py-5 transition-colors duration-150 sm:gap-8"
            >
                <span
                    aria-hidden
                    className="figure w-10 shrink-0 text-lg font-medium text-fg-faint transition-colors duration-150 group-hover:text-accent sm:w-16 sm:text-2xl"
                >
                    {String(index).padStart(2, "0")}
                </span>

                <div className="w-28 shrink-0 sm:w-44">
                    <GameCover
                        title={game.title}
                        slug={game.slug}
                        coverUrl={game.coverUrl}
                        rating={game.ageRating}
                        sizes="(max-width: 640px) 112px, 176px"
                    />
                </div>

                <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-semibold tracking-tight text-fg transition-colors duration-150 group-hover:text-accent sm:text-base">
                        {game.title}
                    </h3>
                    <p className="mt-1 truncate text-xs text-fg-faint">
                        {game.publisherName ?? "Elysian"} · {game.ageRating}
                    </p>
                </div>

                <div className="hidden shrink-0 text-right sm:block">
                    <p className="figure text-sm text-fg">
                        {game.basePricePaisa === 0
                            ? "Free to play"
                            : paisaToNpr(game.basePricePaisa)}
                    </p>
                    <p className="figure mt-1 text-xs text-fg-faint">
                        {game.reviewCount} reviews
                    </p>
                </div>
            </Link>
        </li>
    );
}

export async function TrendingRanking() {
    const { games } = await getTrending(12);
    const ranked = games
        .slice()
        .sort((a, b) => b.trendingScore - a.trendingScore)
        .slice(0, 5);

    if (ranked.length === 0) return null;

    return (
        <section aria-labelledby="trending" className="border-y border-line bg-surface-2">
            <div className={`${CONTAINER} py-16 lg:py-26`}>
                <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
                    <div className="lg:col-span-4">
                        <div id="trending">
                            {ruleHead("This week", "Trending now")}
                        </div>
                        <p className="max-w-sm text-sm leading-relaxed text-fg-muted">
                            Ranked by sales over the last fourteen days, weighted with wishlist
                            adds. Updated as orders clear.
                        </p>
                        <div className="mt-6">
                            <ActionLink href="/games?sort=trending" variant="secondary">
                                See the full chart
                            </ActionLink>
                        </div>
                    </div>

                    <div className="lg:col-span-8">
                        <ol className="-mt-px">
                            {ranked.map((game, i) => (
                                <RankRow key={game.id} index={i + 1} game={game} />
                            ))}
                        </ol>
                    </div>
                </div>
            </div>
        </section>
    );
}

export function TrendingRankingSkeleton() {
    return (
        <section aria-busy className="border-y border-line bg-surface-2">
            <div className={`${CONTAINER} py-16 lg:py-26`}>
                <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
                    <div className="lg:col-span-4">
                        <Skeleton className="h-3 w-24" />
                        <Skeleton className="mt-3 h-7 w-44" />
                        <Skeleton className="mt-6 h-16 w-full" />
                    </div>
                    <div className="lg:col-span-8">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="flex items-center gap-6 border-t border-line py-5">
                                <Skeleton className="h-6 w-10" />
                                <Skeleton className="aspect-[16/10] w-44" />
                                <Skeleton className="h-5 flex-1" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}

/* ------------------------------------------------------- genres, as type */

export async function GenreStrip() {
    const { genres } = await getGenres();

    if (genres.length === 0) return null;

    return (
        <section aria-labelledby="genres" className={`${CONTAINER} py-16 lg:py-26`}>
            <div id="genres">{ruleHead("Shelf by shelf", "Browse by genre")}</div>

            <ul className="grid grid-cols-2 border-t border-line sm:grid-cols-3 lg:grid-cols-4">
                {genres.map((genre, i) => (
                    <li key={genre.id} className="border-b border-line">
                        <Link
                            href={`/games?genre=${genre.slug}`}
                            className={[
                                "flex items-baseline justify-between gap-3 border-line py-5 pr-4 transition-colors duration-150",
                                i % 2 === 0 ? "font-semibold" : "font-normal",
                                "hover:text-accent",
                            ].join(" ")}
                        >
                            <span className="condensed truncate text-base tracking-tight sm:text-lg">
                                {genre.name}
                            </span>
                            <span aria-hidden className="figure text-xs text-fg-faint">
                                →
                            </span>
                        </Link>
                    </li>
                ))}
            </ul>
        </section>
    );
}

export function GenreStripSkeleton() {
    return (
        <section aria-busy className={`${CONTAINER} py-16 lg:py-26`}>
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-3 h-7 w-52" />
            <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                    <Skeleton key={i} className="h-12" />
                ))}
            </div>
        </section>
    );
}

/* ----------------------------------------- assurance: facts, not icon boxes */

const FACTS = [
    {
        label: "Payment",
        title: "eSewa, Khalti, ConnectIPS, IME Pay",
        body: `Pay in rupees through the providers you already use. The checkout shows the full total, including VAT (13%), before you confirm.`,
    },
    {
        label: "Delivery",
        title: "The library updates when payment clears",
        body: "Your key, the download and every future build appear in your library the moment the provider confirms. No waiting on an email.",
    },
    {
        label: "Refunds",
        title: "14 days, or 2 hours of play",
        body: "Either condition ends the window, whichever comes first. Refunds return to the original payment method and reverse the license.",
    },
    {
        label: "Pricing",
        title: "The server sets every total",
        body: "Promotions and coupons are applied server side and the tax is calculated once. What you are quoted is what you are charged.",
    },
] as const;

export function AssuranceBand() {
    return (
        <section aria-labelledby="assurance" className="border-t border-line bg-surface-2">
            <div className={`${CONTAINER} py-16 lg:py-26`}>
                <div id="assurance">
                    {ruleHead("How the store runs", "Plain terms")}
                </div>

                <div className="grid gap-x-10 gap-y-8 sm:grid-cols-2">
                    {FACTS.map((fact) => (
                        <article key={fact.label} className="border-t border-line pt-5">
                            <p className="kicker text-accent">{fact.label}</p>
                            <h3 className="mt-3 text-base font-semibold leading-snug tracking-tight">
                                {fact.title}
                            </h3>
                            <p className="mt-2 max-w-md text-sm leading-relaxed text-fg-muted">
                                {fact.body}
                            </p>
                        </article>
                    ))}
                </div>

                <p className="kicker mt-10 border-t border-line pt-5 text-fg-faint">
                    Accepted: {PAYMENT_PROVIDERS.join(" / ")}
                </p>
            </div>
        </section>
    );
}

/* --------------------------------------------------------- closing line */

export function ClosingCta() {
    return (
        <section aria-labelledby="closing" className={`${CONTAINER} py-16 lg:py-26`}>
            <div className="grid items-end gap-8 border-t border-line pt-10 lg:grid-cols-12">
                <div className="lg:col-span-8">
                <p id="closing" className="kicker text-fg-faint">
                    The whole catalogue
                </p>
                    <p className="display-expanded mt-4 max-w-3xl text-2xl font-semibold leading-tight tracking-tight">
                        Pick a title. Pay in rupees. It is in your library before the tab
                        closes.
                    </p>
                </div>
                <div className="lg:col-span-4 lg:text-right">
                    <ActionLink href="/games" size="lg">
                        Browse the store
                    </ActionLink>
                </div>
            </div>
        </section>
    );
}
