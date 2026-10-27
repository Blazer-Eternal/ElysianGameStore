import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PurchaseRail } from "@/features/catalog/PurchaseRail";
import { ReviewSection } from "@/features/catalog/ReviewSection";
import { GameCard } from "@/components/commerce/GameCard";
import { GameCover } from "@/components/commerce/GameCover";
import { AGE_RATING_LABELS } from "@/constants/nav";
import { api } from "@/lib/api";
import { formatBytes, formatDate } from "@/lib/money";
import type { GameDetail, ReviewListResponse, SearchResponse, SystemRequirement } from "@/types";

type Params = { params: Promise<{ slug: string }> };

const CONTAINER = "mx-auto w-full max-w-[84rem] px-4 pb-16 sm:px-6 lg:px-10";

export async function generateMetadata({ params }: Params): Promise<Metadata> {
    const { slug } = await params;
    try {
        const detail = await api.get<GameDetail>(`/games/${slug}`);
        return {
            title: detail.game.title,
            description: detail.game.shortDesc.slice(0, 160),
        };
    } catch {
        return { title: "Game not found" };
    }
}

const SPEC_ROWS: Array<{ key: keyof SystemRequirement; label: string }> = [
    { key: "os", label: "Operating system" },
    { key: "cpu", label: "Processor" },
    { key: "gpu", label: "Graphics" },
    { key: "ramGb", label: "Memory" },
    { key: "storageGb", label: "Storage" },
    { key: "directx", label: "DirectX" },
];

const specValue = (value: string | number | null | undefined, key: string): string => {
    if (value === null || value === undefined || value === "") return "Not specified";
    if (key === "ramGb" || key === "storageGb") return `${value} GB`;
    return String(value);
};

export default async function GameDetailPage({ params }: Params) {
    const { slug } = await params;

    let detail: GameDetail | null = null;
    try {
        detail = await api.get<GameDetail>(`/games/${slug}`);
    } catch {
        detail = null;
    }
    if (!detail) notFound();

    const { game, publisher, genres, tags, systemRequirements, media, builds, price } = detail;

    const cover = media.find((m) => m.type === "COVER")?.url ?? null;
    const minimum = systemRequirements.find((r) => r.type === "MIN");
    const recommended = systemRequirements.find((r) => r.type === "REC");
    const primaryGenre = genres[0];

    // Review count for the meta line + related titles on the same genre
    // rail. Both are public reads; either failing degrades to a smaller page.
    const [reviewTotal, related] = await Promise.all([
        api
            .get<ReviewListResponse>(`/reviews?gameId=${game.id}&pageSize=1`)
            .then((r) => r.total)
            .catch(() => 0),
        primaryGenre
            ? api
                  .get<SearchResponse>(
                      `/games?genre=${primaryGenre.slug}&pageSize=5&sort=top_rated`,
                  )
                  .then((r) => r.games.filter((g) => g.id !== game.id).slice(0, 4))
                  .catch(() => [])
            : Promise.resolve([]),
    ]);

    return (
        <div className={CONTAINER}>
            {/* Breadcrumb, set as mono type */}
            <nav aria-label="Breadcrumb" className="pt-8">
                <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-fg-faint">
                    <li>
                        <Link href="/games" className="transition-colors duration-150 hover:text-accent">
                            Store
                        </Link>
                    </li>
                    {primaryGenre ? (
                        <>
                            <li aria-hidden>/</li>
                            <li>
                                <Link
                                    href={`/games?genre=${primaryGenre.slug}`}
                                    className="transition-colors duration-150 hover:text-accent"
                                >
                                    {primaryGenre.name}
                                </Link>
                            </li>
                        </>
                    ) : null}
                    <li aria-hidden>/</li>
                    <li className="text-fg-muted">{game.title}</li>
                </ol>
            </nav>

            {/* Front matter: artwork left, buy rail right */}
            <div className="mt-6 grid gap-10 lg:grid-cols-12 lg:gap-12">
                <div className="lg:col-span-8">
                    <GameCover
                        title={game.title}
                        slug={game.slug}
                        coverUrl={cover}
                        rating={game.ageRating}
                        sizes="(max-width: 1024px) 100vw, 62vw"
                    />

                    <p className="kicker mt-6 text-accent">
                        {publisher?.name ?? "Elysian"}
                        {game.isEarlyAccess ? " · Early access" : ""}
                    </p>

                    <h1 className="display-expanded mt-3 text-2xl font-semibold leading-[1.05]">
                        {game.title}
                    </h1>

                    <p className="mt-4 max-w-3xl text-base leading-relaxed text-fg-muted">
                        {game.shortDesc}
                    </p>

                    <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 border-y border-line py-4">
                        <span className="figure text-xs text-fg-muted">
                            {reviewTotal > 0
                                ? `${reviewTotal} ${reviewTotal === 1 ? "review" : "reviews"}`
                                : "No reviews yet"}
                        </span>
                        <span className="figure text-xs text-fg-muted">
                            {game.releaseDate ? `Released ${formatDate(game.releaseDate)}` : "Release date TBC"}
                        </span>
                        <span className="text-xs text-fg-muted">
                            {AGE_RATING_LABELS[game.ageRating] ?? game.ageRating}
                        </span>
                        <span className="figure text-xs text-fg-muted">{game.currency}</span>
                    </div>

                    {/* Genres and tags as linked type, not pills */}
                    {genres.length > 0 || tags.length > 0 ? (
                        <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3">
                            {genres.map((genre) => (
                                <Link
                                    key={genre.id}
                                    href={`/games?genre=${genre.slug}`}
                                    className="link-underline text-sm text-fg hover:text-accent"
                                >
                                    {genre.name}
                                </Link>
                            ))}
                            {tags.slice(0, 8).map((tag) => (
                                <Link
                                    key={tag.id}
                                    href={`/games?tag=${tag.slug}`}
                                    className="font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-fg-faint transition-colors duration-150 hover:text-accent"
                                >
                                    {tag.name}
                                </Link>
                            ))}
                        </div>
                    ) : null}
                </div>

                <div className="lg:col-span-4">
                    <div className="lg:sticky lg:top-28">
                        <PurchaseRail
                            gameId={game.id}
                            slug={game.slug}
                            price={price}
                            isEarlyAccess={game.isEarlyAccess}
                        />
                    </div>
                </div>
            </div>

            {/* Description */}
            {game.longDesc ? (
                <section aria-labelledby="about" className="pt-16">
                    <div className="border-b border-line pb-4">
                        <p className="kicker text-fg-faint">The game</p>
                        <h2 id="about" className="mt-2 text-xl font-semibold tracking-tight">
                            About this game
                        </h2>
                    </div>
                    <div className="mt-6 max-w-3xl whitespace-pre-line text-base leading-relaxed text-fg-muted">
                        {game.longDesc}
                    </div>
                </section>
            ) : null}

            {/* System requirements: a spec sheet, hairlines only */}
            {systemRequirements.length > 0 ? (
                <section aria-labelledby="requirements" className="pt-16">
                    <div className="border-b border-line pb-4">
                        <p className="kicker text-fg-faint">Spec sheet</p>
                        <h2 id="requirements" className="mt-2 text-xl font-semibold tracking-tight">
                            System requirements
                        </h2>
                    </div>

                    <div className="grid gap-x-12 gap-y-8 pt-6 sm:grid-cols-2">
                        {[
                            { req: minimum, title: "Minimum" },
                            { req: recommended, title: "Recommended" },
                        ].map(({ req, title }) =>
                            req ? (
                                <div key={title}>
                                    <p className="kicker text-accent">{title}</p>
                                    <dl className="mt-4">
                                        {SPEC_ROWS.map((row) => (
                                            <div
                                                key={row.key}
                                                className="flex items-baseline justify-between gap-6 border-t border-line py-3"
                                            >
                                                <dt className="font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-fg-faint">
                                                    {row.label}
                                                </dt>
                                                <dd className="text-right text-sm text-fg-muted">
                                                    {specValue(req[row.key] as string | number | null, row.key)}
                                                </dd>
                                            </div>
                                        ))}
                                    </dl>
                                </div>
                            ) : null,
                        )}
                    </div>
                </section>
            ) : null}

            {/* Builds: what actually downloads */}
            {builds.length > 0 ? (
                <section aria-labelledby="builds" className="pt-16">
                    <div className="border-b border-line pb-4">
                        <p className="kicker text-fg-faint">Delivery</p>
                        <h2 id="builds" className="mt-2 text-xl font-semibold tracking-tight">
                            Current build
                        </h2>
                    </div>
                    <ul>
                        {builds.map((build) => (
                            <li
                                key={build.id}
                                className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2 border-b border-line py-4"
                            >
                                <span className="figure text-sm text-fg">v{build.version}</span>
                                <span className="font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-fg-muted">
                                    {build.platform}
                                </span>
                                <span className="figure text-sm text-fg-muted">
                                    {formatBytes(build.fileSizeBytes)}
                                </span>
                                <span className="figure max-w-full truncate text-xs text-fg-faint">
                                    sha256 {build.checksumSha256.slice(0, 16)}…
                                </span>
                            </li>
                        ))}
                    </ul>
                </section>
            ) : null}

            <ReviewSection gameId={game.id} slug={game.slug} />

            {related.length > 0 ? (
                <section aria-labelledby="related" className="pt-16">
                    <div className="border-b border-line pb-4">
                        <p className="kicker text-fg-faint">Same shelf</p>
                        <h2 id="related" className="mt-2 text-xl font-semibold tracking-tight">
                            More {primaryGenre ? primaryGenre.name.toLowerCase() : "like this"}
                        </h2>
                    </div>
                    <div className="mt-8 grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-4">
                        {related.map((g) => (
                            <GameCard key={g.id} game={g} />
                        ))}
                    </div>
                </section>
            ) : null}
        </div>
    );
}
