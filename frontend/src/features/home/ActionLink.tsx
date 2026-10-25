import Link from "next/link";
import type { ReactNode } from "react";

// A link that wears the Button skin (ui/Button.tsx) without nesting a
// <button> inside an <a>. Same variants, same 44px target, same mono
// uppercase label: color inversion on hover, never opacity (DESIGN.md).

type Variant = "primary" | "secondary";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
    primary:
        "bg-accent text-on-accent border border-accent hover:bg-accent-hover hover:border-accent-hover",
    secondary:
        "bg-transparent text-fg border border-line-strong hover:bg-fg hover:text-bg hover:border-fg",
};

const sizes: Record<Size, string> = {
    sm: "h-9 px-3 text-[0.6875rem]",
    md: "h-11 px-5 text-xs",
    lg: "h-12 px-7 text-xs",
};

export function ActionLink({
    href,
    variant = "primary",
    size = "md",
    children,
    className = "",
    ariaLabel,
}: {
    href: string;
    variant?: Variant;
    size?: Size;
    children: ReactNode;
    className?: string;
    ariaLabel?: string;
}) {
    return (
        <Link
            href={href}
            aria-label={ariaLabel}
            className={[
                "inline-flex items-center justify-center gap-2 rounded-[2px]",
                "font-mono font-medium uppercase tracking-[0.12em]",
                "transition-colors duration-150 ease-out",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
                variants[variant],
                sizes[size],
                className,
            ].join(" ")}
        >
            {children}
        </Link>
    );
}
