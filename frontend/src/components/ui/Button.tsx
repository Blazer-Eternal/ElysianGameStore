import { forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";

// Square, 44px, uppercase mono label. Hover inverts or thickens — never
// fades opacity (DESIGN.md).

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
    primary:
        "bg-accent text-on-accent border border-accent hover:bg-accent-hover hover:border-accent-hover",
    secondary:
        "bg-transparent text-fg border border-line-strong hover:bg-fg hover:text-bg hover:border-fg",
    ghost: "bg-transparent text-fg border border-transparent hover:text-accent",
    danger: "bg-transparent text-danger border border-danger hover:bg-danger hover:text-bg",
};

const sizes: Record<Size, string> = {
    sm: "h-9 px-3 text-[0.6875rem]",
    md: "h-11 px-5 text-xs",
    lg: "h-12 px-7 text-xs",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: Variant;
    size?: Size;
    loading?: boolean;
    block?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
    { variant = "primary", size = "md", loading = false, block = false, className = "", disabled, children, ...rest },
    ref,
) {
    return (
        <button
            ref={ref}
            disabled={disabled || loading}
            className={[
                "inline-flex items-center justify-center gap-2 rounded-[2px]",
                "font-mono font-medium uppercase tracking-[0.12em]",
                "transition-colors duration-150 ease-out",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
                "disabled:pointer-events-none disabled:opacity-40",
                variants[variant],
                sizes[size],
                block ? "w-full" : "",
                className,
            ].join(" ")}
            {...rest}
        >
            {loading ? (
                <span
                    aria-hidden
                    className="h-3.5 w-3.5 animate-spin border-[1.5px] border-current border-t-transparent"
                />
            ) : null}
            {children}
        </button>
    );
});
