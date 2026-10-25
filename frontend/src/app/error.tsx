"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/Button";

// Route-group error boundary. Plain, factual, no stack traces exposed.
export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Surface it for debugging without rendering it to the user.
        console.error(error);
    }, [error]);

    return (
        <div className="mx-auto flex w-full max-w-[84rem] flex-col justify-center px-4 py-24 sm:px-6 lg:px-10">
            <p className="kicker text-fg-faint">Error {error.digest ? `· ${error.digest}` : ""}</p>
            <h1 className="display-expanded mt-4 max-w-2xl text-2xl font-semibold">
                Something went wrong on this page.
            </h1>
            <p className="mt-4 max-w-md text-sm text-fg-muted">
                The fault is on our side. Try again, and if it keeps happening the issue reference
                above helps us trace it.
            </p>
            <div className="mt-8 flex gap-3">
                <Button onClick={reset}>Try again</Button>
                <Button variant="secondary" onClick={() => (window.location.href = "/")}>
                    Back to store
                </Button>
            </div>
        </div>
    );
}
