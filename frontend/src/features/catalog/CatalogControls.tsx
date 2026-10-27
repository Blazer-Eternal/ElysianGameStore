"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Field";
import { SORT_OPTIONS } from "@/constants/nav";
import type { Genre, Tag } from "@/types";

// URL-driven filter bar: the server reads searchParams, this only rewrites
// them (replace, no scroll jump, page reset on any change). Price inputs are
// in rupees and converted to the API's paisa once, here.
//
// Controls sit in a hairline grid, not a floating card: same system as the
// rest of the store (DESIGN.md).

const ANY = "";

export function CatalogControls({
    genres,
    tags,
}: {
    genres: Genre[];
    tags: Tag[];
}) {
    const router = useRouter();
    const searchParams = useSearchParams();

    const q = searchParams.get("q") ?? "";
    const sort = searchParams.get("sort") ?? "newest";
    const genre = searchParams.get("genre") ?? ANY;
    const tag = searchParams.get("tag") ?? ANY;
    const minRating = searchParams.get("minRating") ?? ANY;
    const priceMinRs = searchParams.get("priceMin")
        ? String(Math.round(Number(searchParams.get("priceMin")) / 100))
        : "";
    const priceMaxRs = searchParams.get("priceMax")
        ? String(Math.round(Number(searchParams.get("priceMax")) / 100))
        : "";

    const [query, setQuery] = useState(q);
    const [minRs, setMinRs] = useState(priceMinRs);
    const [maxRs, setMaxRs] = useState(priceMaxRs);

    /** Rewrite the query string; any filter change drops back to page 1. */
    const apply = (patch: Record<string, string>) => {
        const params = new URLSearchParams(searchParams.toString());
        for (const [key, value] of Object.entries(patch)) {
            if (value === "" || value === undefined) params.delete(key);
            else params.set(key, value);
        }
        if (!("page" in patch)) params.delete("page");
        const qs = params.toString();
        router.replace(qs ? `/games?${qs}` : "/games", { scroll: false });
    };

    const hasFilters =
        q !== "" || genre !== ANY || tag !== ANY || minRating !== ANY || priceMinRs !== "" || priceMaxRs !== "";

    const applyPrice = () => {
        apply({
            priceMin: minRs ? String(Math.round(Number(minRs) * 100)) : "",
            priceMax: maxRs ? String(Math.round(Number(maxRs) * 100)) : "",
        });
    };

    return (
        <form
            role="search"
            aria-label="Filter the catalogue"
            onSubmit={(e) => {
                e.preventDefault();
                apply({ q: query.trim() });
            }}
            className="border-t border-line"
        >
            {/* Row 1: search + sort */}
            <div className="flex flex-col gap-4 border-b border-line py-4 sm:flex-row sm:items-end">
                <div className="flex-1">
                    <Input
                        label="Search"
                        type="search"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Title, publisher, genre"
                        className="h-11"
                    />
                </div>
                <div className="sm:w-56">
                    <Select
                        label="Sort by"
                        value={sort}
                        onChange={(e) => apply({ sort: e.target.value })}
                        options={SORT_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                    />
                </div>
                <div className="sm:w-auto">
                    {/* Submit only exists for the search field; keeps Enter working. */}
                    <Button type="submit" size="md" className="sm:h-11 sm:self-end">
                        Search
                    </Button>
                </div>
            </div>

            {/* Row 2: facets */}
            <div className="grid grid-cols-1 gap-4 border-b border-line py-4 sm:grid-cols-2 lg:grid-cols-4">
                <Select
                    label="Genre"
                    value={genre}
                    onChange={(e) => apply({ genre: e.target.value })}
                    options={[
                        { value: ANY, label: "All genres" },
                        ...genres.map((g) => ({ value: g.slug, label: g.name })),
                    ]}
                />
                <Select
                    label="Tag"
                    value={tag}
                    onChange={(e) => apply({ tag: e.target.value })}
                    options={[
                        { value: ANY, label: "Any tag" },
                        ...tags.map((t) => ({ value: t.slug, label: t.name })),
                    ]}
                />
                <Select
                    label="Rating"
                    value={minRating}
                    onChange={(e) => apply({ minRating: e.target.value })}
                    options={[
                        { value: ANY, label: "Any rating" },
                        { value: "0.9", label: "90% positive or better" },
                        { value: "0.8", label: "80% positive or better" },
                        { value: "0.7", label: "70% positive or better" },
                    ]}
                />
                <fieldset className="flex items-end gap-2">
                    <legend className="sr-only">Price range in rupees</legend>
                    <div className="w-full">
                        <Input
                            label="Min Rs"
                            type="number"
                            inputMode="numeric"
                            min={0}
                            value={minRs}
                            onChange={(e) => setMinRs(e.target.value)}
                            placeholder="0"
                        />
                    </div>
                    <div className="w-full">
                        <Input
                            label="Max Rs"
                            type="number"
                            inputMode="numeric"
                            min={0}
                            value={maxRs}
                            onChange={(e) => setMaxRs(e.target.value)}
                            placeholder="Any"
                        />
                    </div>
                    <Button type="button" variant="secondary" size="md" onClick={applyPrice}>
                        Apply
                    </Button>
                </fieldset>
            </div>

            {/* Active filters, as removable type */}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 py-3">
                <p className="kicker text-fg-faint">Filters</p>
                {q ? (
                    <button
                        type="button"
                        onClick={() => {
                            setQuery("");
                            apply({ q: "" });
                        }}
                        className="link-underline text-xs text-fg-muted hover:text-accent"
                    >
                        “{q}” ×
                    </button>
                ) : null}
                {genre ? (
                    <button
                        type="button"
                        onClick={() => apply({ genre: "" })}
                        className="link-underline text-xs text-fg-muted hover:text-accent"
                    >
                        {genres.find((g) => g.slug === genre)?.name ?? genre} ×
                    </button>
                ) : null}
                {tag ? (
                    <button
                        type="button"
                        onClick={() => apply({ tag: "" })}
                        className="link-underline text-xs text-fg-muted hover:text-accent"
                    >
                        {tags.find((t) => t.slug === tag)?.name ?? tag} ×
                    </button>
                ) : null}
                {minRating ? (
                    <button
                        type="button"
                        onClick={() => apply({ minRating: "" })}
                        className="link-underline text-xs text-fg-muted hover:text-accent"
                    >
                        {Math.round(Number(minRating) * 100)}% positive or better ×
                    </button>
                ) : null}
                {priceMinRs || priceMaxRs ? (
                    <button
                        type="button"
                        onClick={() => {
                            setMinRs("");
                            setMaxRs("");
                            apply({ priceMin: "", priceMax: "" });
                        }}
                        className="link-underline text-xs text-fg-muted hover:text-accent"
                    >
                        Rs {priceMinRs || "0"} to Rs {priceMaxRs || "any"} ×
                    </button>
                ) : null}
                {hasFilters ? (
                    <button
                        type="button"
                        onClick={() => {
                            setQuery("");
                            setMinRs("");
                            setMaxRs("");
                            router.replace("/games", { scroll: false });
                        }}
                        className="font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-accent hover:underline"
                    >
                        Clear all
                    </button>
                ) : (
                    <span className="text-xs text-fg-faint">None applied</span>
                )}
            </div>
        </form>
    );
}
