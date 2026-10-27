"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { LockIcon } from "@/components/ui/icons";
import { useAuth } from "@/lib/auth";
import { ApiError } from "@/lib/api";

// Sign-in form. Errors come in two shapes: field-level (Zod `details`,
// keyed by path via ApiError.fieldErrors) and form-level (the message, e.g.
// "Invalid credentials"). The `next` param is honoured only for relative
// same-site paths.

const safeNext = (value: string | null): string => {
    if (!value) return "/";
    if (!value.startsWith("/") || value.startsWith("//")) return "/";
    return value;
};

const DEMO = { email: "aarav@example.com", password: "Demo@12345!" };

function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { login } = useAuth();

    const next = safeNext(searchParams.get("next"));

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [formError, setFormError] = useState("");
    const [sending, setSending] = useState(false);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSending(true);
        setFormError("");
        setFieldErrors({});
        try {
            await login(email.trim(), password);
            router.replace(next);
            // No redirect back on purpose: navigation replaces this view.
        } catch (error) {
            if (error instanceof ApiError) {
                setFieldErrors(error.fieldErrors);
                setFormError(error.message);
            } else {
                setFormError("Could not reach the store. Try again in a moment.");
            }
            setSending(false);
        }
    };

    const fillDemo = () => {
        setEmail(DEMO.email);
        setPassword(DEMO.password);
        setFormError("");
        setFieldErrors({});
    };

    return (
        <form onSubmit={submit} noValidate>
            <p className="kicker text-fg-faint">Account</p>
            <h1 className="display-expanded mt-3 text-2xl font-semibold">Sign in</h1>
            <p className="mt-3 text-sm text-fg-muted">
                Your library, orders and wishlist live behind this door.
            </p>

            {formError ? (
                <p className="mt-5 border-l-2 border-danger bg-surface-2 px-3 py-2 text-sm text-danger" role="alert">
                    {formError}
                </p>
            ) : null}

            <div className="mt-6 space-y-4">
                <Input
                    label="Email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    error={fieldErrors.email}
                    placeholder="you@example.com"
                    required
                />
                <Input
                    label="Password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    error={fieldErrors.password}
                    placeholder="Your password"
                    required
                />
            </div>

            <div className="mt-6">
                <Button type="submit" block loading={sending}>
                    <LockIcon size={15} />
                    Sign in
                </Button>
            </div>

            <p className="mt-5 text-center text-sm text-fg-muted">
                No account yet?{" "}
                <Link
                    href={`/register${next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`}
                    className="link-underline text-fg hover:text-accent"
                >
                    Create one
                </Link>
            </p>

            {/* Demo credentials: a hairline note, useful for a demo store */}
            <div className="mt-8 border-t border-line pt-5">
                <p className="kicker text-fg-faint">Demo account</p>
                <dl className="mt-3 space-y-1.5">
                    <div className="flex items-baseline justify-between gap-3">
                        <dt className="text-xs text-fg-faint">Email</dt>
                        <dd className="figure text-xs text-fg-muted">{DEMO.email}</dd>
                    </div>
                    <div className="flex items-baseline justify-between gap-3">
                        <dt className="text-xs text-fg-faint">Password</dt>
                        <dd className="figure text-xs text-fg-muted">{DEMO.password}</dd>
                    </div>
                </dl>
                <button
                    type="button"
                    onClick={fillDemo}
                    className="mt-3 font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-accent hover:underline"
                >
                    Fill the form
                </button>
            </div>
        </form>
    );
}

export default function LoginPage() {
    // useSearchParams needs a Suspense boundary when the route is prerendered.
    return (
        <Suspense fallback={null}>
            <LoginForm />
        </Suspense>
    );
}
