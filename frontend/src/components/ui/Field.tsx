import { forwardRef, useId } from "react";
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

// Square, 44px, hairline border, label above in mono caps. Errors print
// below in danger. No floating labels, no glow.

const fieldShell =
    "w-full rounded-[2px] border border-line bg-surface px-3.5 text-fg " +
    "placeholder:text-fg-faint transition-colors duration-150 ease-out " +
    "hover:border-line-strong focus:border-accent focus:outline-2 " +
    "focus:outline-offset-2 focus:outline-focus disabled:opacity-50 " +
    "disabled:cursor-not-allowed";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    hint?: string;
    error?: string;
    /** Renders label + control + error as one unit. */
    field?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
    { label, hint, error, field = true, id, className = "", ...rest },
    ref,
) {
    const autoId = useId();
    const inputId = id ?? autoId;
    const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined;

    const control = (
        <input
            ref={ref}
            id={inputId}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            className={[fieldShell, "h-11 text-sm", className].join(" ")}
            {...rest}
        />
    );

    if (!field) return control;

    return (
        <div className="flex flex-col gap-1.5">
            {label ? (
                <label htmlFor={inputId} className="font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-fg-muted">
                    {label}
                </label>
            ) : null}
            {control}
            {error ? (
                <p id={`${inputId}-error`} className="text-xs text-danger" role="alert">
                    {error}
                </p>
            ) : hint ? (
                <p id={`${inputId}-hint`} className="text-xs text-fg-faint">
                    {hint}
                </p>
            ) : null}
        </div>
    );
});

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
    label?: string;
    error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
    { label, error, id, className = "", rows = 5, ...rest },
    ref,
) {
    const autoId = useId();
    const fieldId = id ?? autoId;
    return (
        <div className="flex flex-col gap-1.5">
            {label ? (
                <label htmlFor={fieldId} className="font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-fg-muted">
                    {label}
                </label>
            ) : null}
            <textarea
                ref={ref}
                id={fieldId}
                rows={rows}
                aria-invalid={error ? true : undefined}
                className={[fieldShell, "min-h-28 py-2.5 text-sm leading-relaxed", className].join(" ")}
                {...rest}
            />
            {error ? (
                <p className="text-xs text-danger" role="alert">
                    {error}
                </p>
            ) : null}
        </div>
    );
});

/** Native select styled to the system (square, hairline, mono value). */
export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & { label?: string; options: Array<{ value: string; label: string }> }>(
    function Select({ label, options, className = "", ...rest }, ref) {
        const fieldId = useId();
        return (
            <div className="flex flex-col gap-1.5">
                {label ? (
                    <label htmlFor={fieldId} className="font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-fg-muted">
                        {label}
                    </label>
                ) : null}
                <select
                    ref={ref}
                    id={fieldId}
                    className={[fieldShell, "h-11 px-3 text-sm", className].join(" ")}
                    {...rest}
                >
                    {options.map((o) => (
                        <option key={o.value} value={o.value}>
                            {o.label}
                        </option>
                    ))}
                </select>
            </div>
        );
    },
);

/** Section header: mono kicker above a hairline, never a pill. */
export function SectionHead({
    kicker,
    title,
    action,
}: {
    kicker: string;
    title: ReactNode;
    action?: ReactNode;
}) {
    return (
        <div className="mb-6 flex items-end justify-between gap-6 border-b border-line pb-4">
            <div>
                <p className="kicker text-fg-faint">{kicker}</p>
                <h2 className="mt-2 text-xl font-semibold tracking-tight">{title}</h2>
            </div>
            {action}
        </div>
    );
}
