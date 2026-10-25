import Link from "next/link";

import { ActionLink } from "@/features/home/ActionLink";
import { getGameDetail, getTrending, pickFeatured } from "@/features/home/data";
import { GameCover, RatingFigure } from "@/components/commerce/GameCover";
import { PriceBlock } from "@/components/commerce/GameCard";
import { Skeleton } from "@/components/ui/Marks";
import { AGE_RATING_LABELS } from "@/constants/nav";
import { formatDate } from "@/lib/money";
import type { GameSummary } from "@/types";

const CONTAINER = "mx-auto w-full max-w-[84rem] px-4 sm:px-6 lg:px-10";

// The front cover: an asymmetric 7/5 statement split, divided by a single
// hairline. Left is the store's position, right is one real game with real
// pricing. No badge above the headline: a mono kicker line carries metadata.

function Featured({ game, detail }: { game: GameSummary; detail: Awaited<ReturnType<typeof getGameDetail>> | null }) {
    const basePaisa = detail?.price.basePricePaisa ?? game.basePricePaisa;
    const currentPaisa = detail?.price.currentPricePaisa ?? game.basePricePaisa;
    const genreLine = detail?.genres.map((g) => g.name).join(" · ");

    return (
        <div className="lg:col-span-5 lg:border-l lg:border-line lg:pl-10 xl:pl-16">
            <p className="kicker text-accent">Featured · Top trending score</p>

            <Link
                href={`/games/${game.slug}`}
                aria-label={`${game.title}, view game`}
                className="mt-4 block focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            >
                <div className="overflow-hidden">
                    <GameCover
                        title={game.title}
                        slug={game.slug}
                        coverUrl={game.coverUrl}
                        rating={game.ageRating}
                        sizes="(max-width: 1024px) 100vw, 38vw"
                        className="transition-transform duration-200 ease-out hover:scale-[1.02]"
                    />
                </div>
            </Link>

            <div className="mt-4 border-t border-line pt-4">
                <Link href={`/games/${game.slug}`} className="group inline-block">
                    <h2 className="text-xl font-semibold tracking-tight text-fg transition-colors duration-150 group-hover:text-accent">
                        {game.title}
                    </h2>
                </Link>

                <p className="mt-1.5 text-sm text-fg-muted">
                    {game.publisherName ?? "Elysian"} · {AGE_RATING_LABELS[game.ageRating] ?? game.ageRating}
                    {game.releaseDate ? ` · Released ${formatDate(game.releaseDate)}` : ""}
                </p>

                <div className="mt-4 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
                    <PriceBlock basePaisa={basePaisa} currentPaisa={currentPaisa} size="lg" />
                    <RatingFigure ratio={game.recommendRatio} count={game.reviewCount} />
                </div>

                <p className="kicker mt-3 text-fg-faint">
                    {genreLine ? `${genreLine} · ` : ""}PC · Digital key
                </p>

                <div className="mt-6 flex flex-wrap gap-3">
                    <ActionLink href={`/games/${game.slug}`}>View game</ActionLink>
                    <ActionLink href="/games" variant="secondary">
                        Browse store
                    </ActionLink>
                </div>
            </div>
        </div>
    );
}

export async function Hero() {
    const { games, total } = await getTrending(12);
    const featured = pickFeatured(games);

    // Promo pricing lives on the detail route. If it cannot be read the
    // hero degrades to the catalog price instead of failing the page.
    const detail = featured ? await getGameDetail(featured.slug).catch(() => null) : null;

    return (
        <section aria-labelledby="hero-heading">
            <div className={`${CONTAINER} py-16 lg:py-26`}>
                <div className="grid gap-12 lg:grid-cols-12 lg:gap-0">
                    <div className="lg:col-span-7 lg:pr-10 xl:pr-16">
                        <p className="kicker text-fg-faint">
                            Kathmandu · {total} PC titles · Prices in NPR
                        </p>
                        <div className="mt-4 h-px bg-line" aria-hidden />

                        <h1 id="hero-heading" className="display-expanded mt-6 text-display font-semibold">
                            PC games, delivered to your library.
                        </h1>

                        <p className="mt-6 max-w-2xl text-base text-fg-muted">
                            Pay in rupees with eSewa, Khalti, ConnectIPS or IME Pay. The key and the
                            download land in your library the moment the payment clears, and the price
                            you see already carries VAT (13%).
                        </p>

                        <dl className="mt-10 grid grid-cols-2 gap-x-6 gap-y-6 border-t border-line pt-6 sm:grid-cols-3">
                            <div>
                                <dt className="kicker text-fg-faint">Catalog</dt>
                                <dd className="figure mt-1.5 text-sm text-fg">{total} titles</dd>
                            </div>
                            <div>
                                <dt className="kicker text-fg-faint">Tax</dt>
                                <dd className="figure mt-1.5 text-sm text-fg">VAT (13%) included</dd>
                            </div>
                            <div>
                                <dt className="kicker text-fg-faint">Refunds</dt>
                                <dd className="figure mt-1.5 text-sm text-fg">14 days / 2 hours</dd>
                            </div>
                        </dl>

                        <div className="mt-8">
                            <ActionLink href="/games" variant="secondary" size="lg">
                                Browse the store
                            </ActionLink>
                        </div>
                    </div>

                    {featured ? (
                        <Featured game={featured} detail={detail} />
                    ) : (
                        <div className="lg:col-span-5 lg:border-l lg:border-line lg:pl-10 xl:pl-16">
                            <p className="kicker text-accent">Featured</p>
                            <p className="mt-4 border-t border-line pt-4 text-base text-fg-muted">
                                The catalog is being restocked. {total} titles are live and more are
                                under review.
                            </p>
                            <div className="mt-6">
                                <ActionLink href="/games">Browse store</ActionLink>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}

/** Flat blocks only: the hero's shape, not a shimmer (DESIGN.md). */
export function HeroSkeleton() {
    return (
        <section aria-busy>
            <div className={`${CONTAINER} py-16 lg:py-26`}>
                <div className="grid gap-12 lg:grid-cols-12 lg:gap-0">
                    <div className="lg:col-span-7 lg:pr-10 xl:pr-16">
                        <Skeleton className="h-3 w-64 max-w-full" />
                        <Skeleton className="mt-4 h-px w-full" />
                        <Skeleton className="mt-6 h-32 w-full" />
                        <Skeleton className="mt-4 h-8 w-3/5" />
                        <Skeleton className="mt-6 h-16 w-full" />
                        <div className="mt-10 grid grid-cols-3 gap-6 border-t border-line pt-6">
                            <Skeleton className="h-10" />
                            <Skeleton className="h-10" />
                            <Skeleton className="h-10" />
                        </div>
                    </div>
                    <div className="lg:col-span-5 lg:border-l lg:border-line lg:pl-10 xl:pl-16">
                        <Skeleton className="h-3 w-44" />
                        <Skeleton className="mt-4 aspect-[16/10] w-full" />
                        <Skeleton className="mt-4 h-7 w-4/5" />
                        <Skeleton className="mt-3 h-4 w-3/5" />
                        <Skeleton className="mt-4 h-5 w-1/2" />
                        <Skeleton className="mt-6 h-11 w-2/3" />
                    </div>
                </div>
            </div>
        </section>
    );
}
