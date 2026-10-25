import Link from "next/link";

import { SITE } from "@/constants/nav";

// Auth pages drop the storefront chrome: a quiet frame with just the
// wordmark, so the form is the only thing on screen.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex min-h-screen flex-col">
            <header className="border-b border-line">
                <div className="mx-auto flex w-full max-w-[84rem] items-center justify-between px-4 py-4 sm:px-6 lg:px-10">
                    <Link
                        href="/"
                        className="display-expanded text-lg font-bold uppercase tracking-[0.06em] text-fg transition-colors duration-150 hover:text-accent"
                    >
                        {SITE.name}
                    </Link>
                    <Link
                        href="/games"
                        className="font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-fg-muted transition-colors duration-150 hover:text-fg"
                    >
                        Back to store
                    </Link>
                </div>
            </header>
            <main className="flex flex-1 items-center justify-center px-4 py-12 sm:px-6">
                <div className="w-full max-w-96">{children}</div>
            </main>
        </div>
    );
}
