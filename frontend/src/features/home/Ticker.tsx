import { getGenres } from "@/features/home/data";
import { Skeleton } from "@/components/ui/Marks";
import { PAYMENT_PROVIDERS } from "@/constants/nav";

// Full-bleed information band: one run of store facts, printed twice so the
// CSS loop (translateX(-50%)) is seamless. Pauses on hover, stops under
// prefers-reduced-motion: both handled in globals.css.

function TickerRun({ items, duplicate = false }: { items: string[]; duplicate?: boolean }) {
    return (
        <div className="flex shrink-0 items-center" aria-hidden={duplicate || undefined}>
            {items.map((item) => (
                <span key={item} className="kicker shrink-0 whitespace-nowrap text-fg-muted">
                    {item}
                    <span className="px-4 text-fg-faint" aria-hidden>
                        /
                    </span>
                </span>
            ))}
        </div>
    );
}

export async function Ticker() {
    const { genres } = await getGenres();

    const items = [
        "Prices in NPR",
        "VAT (13%) included",
        ...PAYMENT_PROVIDERS,
        "Instant delivery to your library",
        ...genres.map((genre) => genre.name),
        "14-day refund window",
        "Windows PC digital keys",
    ];

    return (
        <div className="ticker overflow-hidden border-y border-line bg-surface-2 py-3">
            {/* w-max keeps one run at exactly 50% of the track, so the
                -50% loop lands on the seam. */}
            <div className="ticker-track w-max">
                <TickerRun items={items} />
                <TickerRun items={items} duplicate />
            </div>
        </div>
    );
}

export function TickerSkeleton() {
    return (
        <div className="border-y border-line bg-surface-2 py-3" aria-busy>
            <Skeleton className="h-4 w-full" />
        </div>
    );
}
