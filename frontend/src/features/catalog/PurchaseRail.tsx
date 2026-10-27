"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { PriceBlock } from "@/components/commerce/GameCard";
import { Button } from "@/components/ui/Button";
import { HeartIcon, LockIcon } from "@/components/ui/icons";
import { useAuth } from "@/lib/auth";
import { addToCart } from "@/lib/cart";
import { api, ApiError } from "@/lib/api";
import type { PriceSummary } from "@/types";

// Buy box for the detail rail. Everything prices server-side: this renders
// the summary the API returned and never computes a total. Wishlist and
// cart mutate through lib/cart (which announces `cart:changed` for the
// header badge).

type CartState = "idle" | "adding" | "added" | "error";
type WishState = "unknown" | "in" | "out" | "busy";

export function PurchaseRail({
    gameId,
    slug,
    price,
    isEarlyAccess,
}: {
    gameId: string;
    slug: string;
    price: PriceSummary;
    isEarlyAccess: boolean;
}) {
    const router = useRouter();
    const { status } = useAuth();
    const [cart, setCart] = useState<CartState>("idle");
    const [buying, setBuying] = useState(false);
    const [cartError, setCartError] = useState("");
    const [wish, setWish] = useState<WishState>("unknown");
    const [wishError, setWishError] = useState("");

    const authed = status === "authenticated";
    const loginHref = `/login?next=/games/${slug}`;

    // Membership check runs once per session; anonymous viewers skip it.
    useEffect(() => {
        if (!authed || wish !== "unknown") return;
        let cancelled = false;
        api.get<{ items: Array<{ gameId: string }> }>("/wishlist?pageSize=100")
            .then((data) => {
                if (cancelled) return;
                setWish(data.items.some((i) => i.gameId === gameId) ? "in" : "out");
            })
            .catch(() => {
                if (!cancelled) setWish("out");
            });
        return () => {
            cancelled = true;
        };
    }, [authed, wish, gameId]);

    const handleAdd = useCallback(async () => {
        setCart("adding");
        setCartError("");
        try {
            await addToCart(gameId);
            setCart("added");
        } catch (error) {
            setCart("error");
            setCartError(error instanceof ApiError ? error.message : "Could not reach the store.");
        }
    }, [gameId]);

    const handleBuyNow = useCallback(async () => {
        setBuying(true);
        setCartError("");
        try {
            await addToCart(gameId);
            setCart("added");
            router.push("/checkout");
        } catch (error) {
            setCart("error");
            setCartError(error instanceof ApiError ? error.message : "Could not reach the store.");
        } finally {
            setBuying(false);
        }
    }, [gameId, router]);

    const toggleWish = useCallback(async () => {
        if (wish === "busy") return;
        setWish("busy");
        setWishError("");
        try {
            if (wish === "in") {
                await api.delete(`/wishlist/${gameId}`);
                setWish("out");
            } else {
                await api.post("/wishlist", { gameId });
                setWish("in");
            }
        } catch (error) {
            setWish(wish === "in" ? "in" : "out");
            setWishError(error instanceof ApiError ? error.message : "Could not reach the store.");
        }
    }, [wish, gameId]);

    const vatPercent = Math.round(price.taxRateBps / 100);

    return (
        <div className="border-t border-line pt-6">
            <PriceBlock
                basePaisa={price.basePricePaisa}
                currentPaisa={price.currentPricePaisa}
                size="lg"
            />
            <p className="figure mt-1.5 text-xs text-fg-faint">
                VAT ({vatPercent}%) included at checkout
            </p>

            <div className="mt-6 flex flex-col gap-3">
                {cart === "added" ? (
                    <>
                        <Link href="/cart">
                            <Button block variant="secondary">
                                In cart · View cart
                            </Button>
                        </Link>
                        <Button block onClick={handleBuyNow} loading={buying}>
                            Buy now
                        </Button>
                    </>
                ) : (
                    <>
                        <Button block onClick={handleAdd} loading={cart === "adding"}>
                            Add to cart
                        </Button>
                        <Button block variant="secondary" onClick={handleBuyNow} loading={buying}>
                            Buy now
                        </Button>
                    </>
                )}
                {cart === "error" ? (
                    <p className="text-xs text-danger" role="alert">
                        {cartError}
                    </p>
                ) : null}
            </div>

            {/* Wishlist: auth-gated, plain type instead of a decorative heart row */}
            <div className="mt-4">
                {authed ? (
                    <button
                        type="button"
                        onClick={() => void toggleWish()}
                        disabled={wish === "unknown" || wish === "busy"}
                        className="inline-flex h-11 items-center gap-2 font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-fg-muted transition-colors duration-150 hover:text-accent disabled:cursor-not-allowed"
                    >
                        <HeartIcon size={17} filled={wish === "in"} />
                        {wish === "in" ? "In your wishlist" : wish === "unknown" ? "Checking…" : "Add to wishlist"}
                    </button>
                ) : (
                    <Link
                        href={loginHref}
                        className="inline-flex h-11 items-center gap-2 font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-fg-muted transition-colors duration-150 hover:text-accent"
                    >
                        <LockIcon size={16} />
                        Sign in to wishlist
                    </Link>
                )}
                {wishError ? (
                    <p className="text-xs text-danger" role="alert">
                        {wishError}
                    </p>
                ) : null}
            </div>

            {/* Factual delivery notes, as a hairline spec list */}
            <dl className="mt-6 space-y-3 border-t border-line pt-5">
                <div className="flex items-baseline justify-between gap-4">
                    <dt className="kicker text-fg-faint">Delivery</dt>
                    <dd className="text-xs text-fg-muted">Instant, to your library</dd>
                </div>
                <div className="flex items-baseline justify-between gap-4">
                    <dt className="kicker text-fg-faint">Platform</dt>
                    <dd className="text-xs text-fg-muted">Windows PC, digital key</dd>
                </div>
                <div className="flex items-baseline justify-between gap-4">
                    <dt className="kicker text-fg-faint">Refunds</dt>
                    <dd className="text-xs text-fg-muted">14 days or 2 hours played</dd>
                </div>
                {isEarlyAccess ? (
                    <div className="flex items-baseline justify-between gap-4">
                        <dt className="kicker text-fg-faint">Stage</dt>
                        <dd className="text-xs text-accent">Early access</dd>
                    </div>
                ) : null}
            </dl>
        </div>
    );
}
