import Link from "next/link";

import { GameCover, RatingFigure } from "@/components/commerce/GameCover";
import { DiscountFigure } from "@/components/ui/Marks";
import { discountPercent, paisaToNpr } from "@/lib/money";
import type { GameSummary } from "@/types";

// Price shown as a figure. Base price only prints when discounted (struck,
// muted); no fake "was" prices, no urgency timers.

export function PriceBlock({
    basePaisa,
    currentPaisa,
    size = "md",
}: {
    basePaisa: number;
    currentPaisa: number;
    size?: "sm" | "md" | "lg";
}) {
    const discount = discountPercent(basePaisa, currentPaisa);
    const sizes = { sm: "text-xs", md: "text-sm", lg: "text-base" } as const;

    if (currentPaisa === 0) {
        return <span className={`figure ${sizes[size]} font-medium text-success`}>Free to play</span>;
    }

    return (
        <span className={`inline-flex items-baseline gap-2 ${sizes[size]}`}>
            {discount !== null ? (
                <span className="figure font-medium text-fg">{paisaToNpr(currentPaisa)}</span>
            ) : (
                <span className="figure text-fg">{paisaToNpr(currentPaisa)}</span>
            )}
            {discount !== null ? (
                <>
                    <span className="figure text-fg-faint line-through">
                        {paisaToNpr(basePaisa)}
                    </span>
                    <DiscountFigure percent={discount} />
                </>
            ) : null}
        </span>
    );
}

/**
 * Catalog tile: cover block over a hairline-separated type block. No card
 * border, no shadow, no rounded corner: the grid rule does the work.
 */
export function GameCard({ game, priority = false }: { game: GameSummary; priority?: boolean }) {
    return (
        <article className="group flex flex-col">
            <Link
                href={`/games/${game.slug}`}
                className="block focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                aria-label={game.title}
            >
                <div className="overflow-hidden">
                    <GameCover
                        title={game.title}
                        slug={game.slug}
                        coverUrl={game.coverUrl}
                        rating={game.ageRating}
                        className="transition-transform duration-200 ease-out group-hover:scale-[1.02]"
                    />
                </div>
            </Link>

            <div className="flex flex-1 flex-col border-t border-line pt-3">
                <div className="flex items-start justify-between gap-3">
                    <Link href={`/games/${game.slug}`} className="min-w-0">
                        <h3 className="truncate text-sm font-semibold leading-snug tracking-tight text-fg transition-colors duration-150 group-hover:text-accent">
                            {game.title}
                        </h3>
                    </Link>
                    {game.isEarlyAccess ? (
                        <span className="kicker shrink-0 text-accent">Early access</span>
                    ) : null}
                </div>

                <p className="mt-1 truncate text-xs text-fg-faint">
                    {game.publisherName ?? "Elysian"} · {game.ageRating}
                </p>

                <div className="mt-3 flex items-end justify-between gap-3">
                    <PriceBlock
                        basePaisa={game.basePricePaisa}
                        currentPaisa={game.basePricePaisa}
                        size="sm"
                    />
                    <RatingFigure ratio={game.recommendRatio} count={game.reviewCount} />
                </div>
            </div>
        </article>
    );
}
