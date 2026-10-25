"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import {
    CartIcon,
    CloseIcon,
    MenuIcon,
    MoonIcon,
    SearchIcon,
    SunIcon,
    UserIcon,
} from "@/components/ui/icons";
import { PRIMARY_NAV, SITE } from "@/constants/nav";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { useTheme } from "@/lib/theme";

function CartLink({ count }: { count: number }) {
    return (
        <Link
            href="/cart"
            aria-label={count > 0 ? `Cart, ${count} items` : "Cart"}
            className="relative flex h-11 w-11 items-center justify-center text-fg transition-colors duration-150 hover:text-accent"
        >
            <CartIcon size={20} />
            {count > 0 ? (
                <span className="figure absolute right-1.5 top-1.5 min-w-4 bg-accent px-1 text-[0.625rem] leading-4 text-on-accent">
                    {count}
                </span>
            ) : null}
        </Link>
    );
}

export function SiteHeader() {
    const pathname = usePathname();
    const { status, user, logout } = useAuth();
    const { theme, toggle } = useTheme();
    const [menuOpen, setMenuOpen] = useState(false);
    const [cartCount, setCartCount] = useState(0);

    // Cart count follows auth: it is meaningless while anonymous and must
    // update after mutations elsewhere (cart page signals via storage events).
    useEffect(() => {
        if (status !== "authenticated") {
            setCartCount(0);
            return;
        }
        let cancelled = false;
        const load = () =>
            api
                .get<{ items: unknown[] }>("/cart")
                .then((cart) => {
                    if (!cancelled) setCartCount(cart.items.length);
                })
                .catch(() => {
                    if (!cancelled) setCartCount(0);
                });
        load();
        window.addEventListener("cart:changed", load);
        return () => {
            cancelled = true;
            window.removeEventListener("cart:changed", load);
        };
    }, [status, pathname]);

    // Close the mobile panel on navigation.
    useEffect(() => {
        setMenuOpen(false);
    }, [pathname]);

    return (
        <header className="sticky top-0 z-40 border-b border-line bg-bg">
            {/* Utility strip: market context, set as type, not decoration */}
            <div className="hidden border-b border-line md:block">
                <div className="mx-auto flex w-full max-w-[84rem] items-center justify-between px-4 py-1.5 sm:px-6 lg:px-10">
                    <p className="kicker text-fg-faint">Kathmandu · Prices in NPR · VAT included</p>
                    <p className="kicker text-fg-faint">Instant delivery to your library</p>
                </div>
            </div>

            <div className="mx-auto flex w-full max-w-[84rem] items-center gap-4 px-4 py-3 sm:px-6 lg:px-10">
                <Link
                    href="/"
                    className="display-expanded shrink-0 text-lg font-bold uppercase tracking-[0.06em] text-fg transition-colors duration-150 hover:text-accent"
                >
                    {SITE.name}
                </Link>

                <nav aria-label="Primary" className="ml-6 hidden items-center gap-6 lg:flex">
                    {PRIMARY_NAV.map((item) => {
                        const active =
                            item.href.split("?")[0] !== "/" && pathname.startsWith(item.href.split("?")[0]);
                        return (
                            <Link
                                key={item.label}
                                href={item.href}
                                className={[
                                    "font-mono text-[0.6875rem] uppercase tracking-[0.14em] transition-colors duration-150",
                                    active ? "text-accent" : "text-fg-muted hover:text-fg",
                                ].join(" ")}
                            >
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>

                <div className="ml-auto flex items-center gap-1">
                    <button
                        type="button"
                        onClick={toggle}
                        aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
                        className="flex h-11 w-11 items-center justify-center text-fg transition-colors duration-150 hover:text-accent"
                    >
                        {theme === "dark" ? <SunIcon size={19} /> : <MoonIcon size={19} />}
                    </button>

                    <Link
                        href="/games"
                        aria-label="Search the store"
                        className="flex h-11 w-11 items-center justify-center text-fg transition-colors duration-150 hover:text-accent"
                    >
                        <SearchIcon size={19} />
                    </Link>

                    <CartLink count={cartCount} />

                    {status === "authenticated" && user ? (
                        <div className="hidden items-center gap-2 sm:flex">
                            <Link
                                href="/library"
                                className="flex h-11 items-center gap-2 px-2 text-fg transition-colors duration-150 hover:text-accent"
                            >
                                <UserIcon size={19} />
                                <span className="font-mono text-[0.6875rem] uppercase tracking-[0.12em]">
                                    {user.username}
                                </span>
                            </Link>
                            <Button variant="ghost" size="sm" onClick={() => void logout()}>
                                Sign out
                            </Button>
                        </div>
                    ) : status === "anonymous" ? (
                        <Link href="/login" className="hidden sm:block">
                            <Button size="sm" variant="secondary">
                                Sign in
                            </Button>
                        </Link>
                    ) : null}

                    <button
                        type="button"
                        onClick={() => setMenuOpen((v) => !v)}
                        aria-expanded={menuOpen}
                        aria-label={menuOpen ? "Close menu" : "Open menu"}
                        className="flex h-11 w-11 items-center justify-center text-fg lg:hidden"
                    >
                        {menuOpen ? <CloseIcon size={20} /> : <MenuIcon size={20} />}
                    </button>
                </div>
            </div>

            {/* Mobile panel: solid stock, hairline separated, no overlay blur */}
            {menuOpen ? (
                <nav aria-label="Mobile" className="border-t border-line bg-bg lg:hidden">
                    <div className="mx-auto flex w-full max-w-[84rem] flex-col px-4 py-2 sm:px-6">
                        {PRIMARY_NAV.map((item) => (
                            <Link
                                key={item.label}
                                href={item.href}
                                className="border-b border-line py-3.5 font-mono text-xs uppercase tracking-[0.14em] text-fg"
                            >
                                {item.label}
                            </Link>
                        ))}
                        <div className="flex gap-3 py-4">
                            {status === "authenticated" ? (
                                <>
                                    <Link href="/library" className="flex-1">
                                        <Button variant="secondary" block>
                                            Library
                                        </Button>
                                    </Link>
                                    <Button variant="ghost" onClick={() => void logout()}>
                                        Sign out
                                    </Button>
                                </>
                            ) : (
                                <Link href="/login" className="flex-1">
                                    <Button block>Sign in</Button>
                                </Link>
                            )}
                        </div>
                    </div>
                </nav>
            ) : null}
        </header>
    );
}
