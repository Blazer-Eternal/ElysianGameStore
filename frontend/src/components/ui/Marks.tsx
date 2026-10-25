import type { ReactNode } from "react";

// Status and metadata marks. NOT pills: no filled rounded containers. A tag
// is mono caps type with an optional hairline box (square corners), or plain
// text — see DESIGN.md.

export function Tag({
    children,
    tone = "neutral",
    boxed = false,
}: {
    children: ReactNode;
    tone?: "neutral" | "accent" | "success" | "danger";
    boxed?: boolean;
}) {
    const tones = {
        neutral: "text-fg-muted",
        accent: "text-accent",
        success: "text-success",
        danger: "text-danger",
    } as const;

    return (
        <span
            className={[
                "inline-block font-mono text-[0.6875rem] uppercase leading-none tracking-[0.12em]",
                boxed ? "border border-line-strong px-2 py-1" : "",
                tones[tone],
            ].join(" ")}
        >
            {children}
        </span>
    );
}

/** Discount figure — a number, not a decorative badge. */
export function DiscountFigure({ percent }: { percent: number }) {
    return (
        <span className="figure text-xs font-medium text-accent">−{percent}%</span>
    );
}

/** Flat skeleton block: solid surface, no shimmer gradient. */
export function Skeleton({ className = "" }: { className?: string }) {
    return <div aria-hidden className={`animate-pulse bg-surface-2 ${className}`} />;
}

export function EmptyState({
    kicker,
    title,
    description,
    action,
}: {
    kicker: string;
    title: string;
    description: string;
    action?: ReactNode;
}) {
    return (
        <div className="border-t border-line py-16">
            <p className="kicker text-fg-faint">{kicker}</p>
            <h3 className="mt-3 text-xl font-semibold tracking-tight">{title}</h3>
            <p className="mt-2 max-w-md text-sm text-fg-muted">{description}</p>
            {action ? <div className="mt-6">{action}</div> : null}
        </div>
    );
}
