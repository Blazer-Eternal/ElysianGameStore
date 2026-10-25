import Link from "next/link";

import { Button } from "@/components/ui/Button";

export default function NotFound() {
    return (
        <div className="mx-auto flex w-full max-w-[84rem] flex-col justify-center px-4 py-24 sm:px-6 lg:px-10">
            <p className="kicker text-fg-faint">404</p>
            <h1 className="display-expanded mt-4 max-w-2xl text-2xl font-semibold">
                This page is not in the catalogue.
            </h1>
            <p className="mt-4 max-w-md text-sm text-fg-muted">
                The link may be out of date, or the game may have been removed from the store.
            </p>
            <div className="mt-8 flex gap-3">
                <Link href="/games">
                    <Button>Browse the store</Button>
                </Link>
                <Link href="/">
                    <Button variant="secondary">Home</Button>
                </Link>
            </div>
        </div>
    );
}
