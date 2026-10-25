"use client";

import { useEffect, useState } from "react";

// The copyright year renders after mount: calling `new Date()` during render
// blocks prerendering (even in client components, which are prerendered too).
// Initial markup is identical on server and client, so no hydration mismatch.
export function CurrentYear() {
    const [year, setYear] = useState("");

    useEffect(() => {
        setYear(String(new Date().getFullYear()));
    }, []);

    return <>{year}</>;
}
