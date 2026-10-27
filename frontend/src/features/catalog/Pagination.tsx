import Link from "next/link";

// Pagination as plain links: no client JS, the server owns the page param.
// Numbers in mono figures, current page marked with ink, never a pill.

const buildHref = (params: URLSearchParams, page: number) => {
    const next = new URLSearchParams(params.toString());
    if (page <= 1) next.delete("page");
    else next.set("page", String(page));
    const qs = next.toString();
    return qs ? `/games?${qs}` : "/games";
};

export function Pagination({
    page,
    pageSize,
    total,
    params,
}: {
    page: number;
    pageSize: number;
    total: number;
    params: URLSearchParams;
}) {
    const pageCount = Math.max(1, Math.ceil(total / pageSize));
    if (pageCount <= 1) return null;

    const window: number[] = [];
    const from = Math.max(1, Math.min(page - 2, pageCount - 4));
    const to = Math.min(pageCount, from + 4);
    for (let p = from; p <= to; p += 1) window.push(p);

    const navLink =
        "inline-flex h-9 min-w-9 items-center justify-center border px-2 font-mono text-xs transition-colors duration-150";

    return (
        <nav aria-label="Catalogue pages" className="mt-10 flex flex-wrap items-center gap-2 border-t border-line pt-6">
            {page > 1 ? (
                <Link
                    href={buildHref(params, page - 1)}
                    className={`${navLink} border-line-strong text-fg-muted hover:border-fg hover:text-fg`}
                >
                    ← Prev
                </Link>
            ) : (
                <span aria-disabled className={`${navLink} border-line text-fg-faint opacity-50`}>
                    ← Prev
                </span>
            )}

            {from > 1 ? (
                <span className="px-1 text-xs text-fg-faint">…</span>
            ) : null}

            {window.map((p) =>
                p === page ? (
                    <span
                        key={p}
                        aria-current="page"
                        className={`${navLink} border-accent bg-accent text-on-accent`}
                    >
                        {p}
                    </span>
                ) : (
                    <Link
                        key={p}
                        href={buildHref(params, p)}
                        className={`${navLink} border-line text-fg-muted hover:border-fg hover:text-fg`}
                    >
                        {p}
                    </Link>
                ),
            )}

            {to < pageCount ? (
                <span className="px-1 text-xs text-fg-faint">…</span>
            ) : null}

            {page < pageCount ? (
                <Link
                    href={buildHref(params, page + 1)}
                    className={`${navLink} border-line-strong text-fg-muted hover:border-fg hover:text-fg`}
                >
                    Next →
                </Link>
            ) : (
                <span aria-disabled className={`${navLink} border-line text-fg-faint opacity-50`}>
                    Next →
                </span>
            )}

            <span className="figure ml-auto text-xs text-fg-faint">
                Page {page} of {pageCount}
            </span>
        </nav>
    );
}
