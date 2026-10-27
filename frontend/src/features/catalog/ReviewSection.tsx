"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Select, Textarea } from "@/components/ui/Field";
import { CheckIcon } from "@/components/ui/icons";
import { EmptyState, Skeleton, Tag } from "@/components/ui/Marks";
import { useAuth } from "@/lib/auth";
import { api, ApiError } from "@/lib/api";
import { formatDate } from "@/lib/money";
import type { Review, ReviewListResponse } from "@/types";

// Reviews for one game: server-paginated list plus the owner-gated composer.
// Moderation and ownership rules belong to the API; this surfaces whatever
// comes back and the exact message when a write is refused.

const PAGE_SIZE = 8;

const SORTS = [
    { value: "recent", label: "Most recent" },
    { value: "helpful", label: "Most helpful" },
    { value: "positive", label: "Positive first" },
    { value: "negative", label: "Critical first" },
];

function ReviewRow({ review, onHelpful, busy }: { review: Review; onHelpful: () => void; busy: boolean }) {
    const recommended = review.recommend;

    return (
        <article className="border-t border-line py-6">
            <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
                <div className="flex items-baseline gap-3">
                    <span className="text-sm font-semibold tracking-tight">
                        {review.user?.username ?? "Verified owner"}
                    </span>
                    <span className="figure text-xs text-fg-faint">{formatDate(review.createdAt)}</span>
                </div>
                <div className="flex items-center gap-4">
                    {typeof review.rating === "number" ? (
                        <span className="figure text-xs text-fg-muted">{review.rating}/5</span>
                    ) : null}
                    <span
                        className={`inline-flex items-center gap-1.5 font-mono text-[0.6875rem] uppercase tracking-[0.12em] ${
                            recommended ? "text-success" : "text-fg-faint"
                        }`}
                    >
                        {recommended ? <CheckIcon size={14} /> : null}
                        {recommended ? "Recommended" : "Not recommended"}
                    </span>
                </div>
            </div>

            {review.body ? (
                <p className="mt-3 max-w-3xl whitespace-pre-line text-sm leading-relaxed text-fg-muted">
                    {review.body}
                </p>
            ) : null}

            <div className="mt-3 flex items-center gap-5">
                <button
                    type="button"
                    onClick={onHelpful}
                    disabled={busy}
                    className="font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-fg-faint transition-colors duration-150 hover:text-accent disabled:cursor-not-allowed"
                >
                    Helpful · {review.helpfulCount}
                </button>
                {review.moderationStatus === "PENDING" ? <Tag tone="accent">Awaiting moderation</Tag> : null}
            </div>
        </article>
    );
}

function Composer({ gameId, onPosted }: { gameId: string; onPosted: () => void }) {
    const [recommend, setRecommend] = useState("yes");
    const [rating, setRating] = useState("5");
    const [body, setBody] = useState("");
    const [sending, setSending] = useState(false);
    const [error, setError] = useState("");

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSending(true);
        setError("");
        try {
            await api.post("/reviews", {
                gameId,
                recommend: recommend === "yes",
                ...(rating ? { rating: Number(rating) } : {}),
                ...(body.trim() ? { body: body.trim() } : {}),
            });
            setBody("");
            onPosted();
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "Could not send the review.");
        } finally {
            setSending(false);
        }
    };

    return (
        <form onSubmit={submit} className="border-t border-line bg-surface-2 p-6">
            <p className="kicker text-fg-faint">Write a review</p>
            <p className="mt-2 text-xs text-fg-muted">
                Reviews are tied to your purchase. Only verified owners can post, and each title
                takes one review.
            </p>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <Select
                    label="Your verdict"
                    value={recommend}
                    onChange={(e) => setRecommend(e.target.value)}
                    options={[
                        { value: "yes", label: "I recommend it" },
                        { value: "no", label: "I do not recommend it" },
                    ]}
                />
                <Select
                    label="Rating"
                    value={rating}
                    onChange={(e) => setRating(e.target.value)}
                    options={[
                        { value: "5", label: "5 / 5" },
                        { value: "4", label: "4 / 5" },
                        { value: "3", label: "3 / 5" },
                        { value: "2", label: "2 / 5" },
                        { value: "1", label: "1 / 5" },
                    ]}
                />
            </div>

            <div className="mt-4">
                <Textarea
                    label="What stood out"
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Performance, length, bugs, value for the price."
                    rows={4}
                />
            </div>

            {error ? (
                <p className="mt-3 text-xs text-danger" role="alert">
                    {error}
                </p>
            ) : null}

            <div className="mt-4">
                <Button type="submit" loading={sending}>
                    Post review
                </Button>
            </div>
        </form>
    );
}

export function ReviewSection({ gameId, slug }: { gameId: string; slug: string }) {
    const { status } = useAuth();
    const [sort, setSort] = useState("recent");
    const [page, setPage] = useState(1);
    const [data, setData] = useState<ReviewListResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [voteBusy, setVoteBusy] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const result = await api.get<ReviewListResponse>(
                `/reviews?gameId=${gameId}&sort=${sort}&page=${page}&pageSize=${PAGE_SIZE}`,
            );
            setData(result);
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "Reviews are unavailable right now.");
        } finally {
            setLoading(false);
        }
    }, [gameId, sort, page]);

    useEffect(() => {
        void load();
    }, [load]);

    const helpful = async (reviewId: string) => {
        if (status !== "authenticated") return;
        setVoteBusy(reviewId);
        try {
            await api.post(`/reviews/${reviewId}/helpful`);
            await load();
        } catch {
            // A repeat vote is not an error worth blocking the list on.
        } finally {
            setVoteBusy(null);
        }
    };

    const total = data?.total ?? 0;
    const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

    return (
        <section aria-labelledby="reviews" className="pt-16">
            <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4 border-b border-line pb-4">
                <div>
                    <p className="kicker text-fg-faint">From owners</p>
                    <h2 id="reviews" className="mt-2 text-xl font-semibold tracking-tight">
                        Reviews
                        {data ? <span className="figure ml-3 text-sm font-normal text-fg-muted">{total}</span> : null}
                    </h2>
                </div>
                <div className="w-48">
                    <Select
                        label="Sort"
                        value={sort}
                        onChange={(e) => {
                            setSort(e.target.value);
                            setPage(1);
                        }}
                        options={SORTS}
                    />
                </div>
            </div>

            {loading ? (
                <div className="border-t border-line" aria-busy>
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="border-b border-line py-6">
                            <Skeleton className="h-4 w-64 max-w-full" />
                            <Skeleton className="mt-3 h-4 w-full max-w-2xl" />
                            <Skeleton className="mt-2 h-4 w-2/3 max-w-xl" />
                        </div>
                    ))}
                </div>
            ) : error ? (
                <p className="border-t border-line py-6 text-sm text-danger" role="alert">
                    {error}
                </p>
            ) : total === 0 ? (
                <EmptyState
                    kicker="No reviews yet"
                    title="Nobody has written about this game."
                    description="Reviews open once the game has been purchased and played. Owners see the form here."
                />
            ) : (
                <>
                    <div>
                        {data?.reviews.map((review) => (
                            <ReviewRow
                                key={review.id}
                                review={review}
                                busy={voteBusy === review.id}
                                onHelpful={() => void helpful(review.id)}
                            />
                        ))}
                    </div>

                    {pageCount > 1 ? (
                        <div className="flex items-center justify-between border-t border-line pt-5">
                            <Button
                                variant="secondary"
                                size="sm"
                                disabled={page <= 1}
                                onClick={() => setPage((p) => p - 1)}
                            >
                                ← Newer
                            </Button>
                            <span className="figure text-xs text-fg-muted">
                                Page {page} of {pageCount}
                            </span>
                            <Button
                                variant="secondary"
                                size="sm"
                                disabled={page >= pageCount}
                                onClick={() => setPage((p) => p + 1)}
                            >
                                Older →
                            </Button>
                        </div>
                    ) : null}
                </>
            )}

            {status === "authenticated" ? (
                <div className="mt-10">
                    <Composer gameId={gameId} onPosted={() => void load()} />
                </div>
            ) : (
                <p className="mt-8 border-t border-line pt-5 text-sm text-fg-muted">
                    <Link href={`/login?next=/games/${slug}`} className="link-underline hover:text-accent">
                        Sign in
                    </Link>{" "}
                    to write a review. Only verified owners can post.
                </p>
            )}
        </section>
    );
}
