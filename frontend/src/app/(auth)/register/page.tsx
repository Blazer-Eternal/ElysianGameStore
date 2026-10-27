"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { useAuth } from "@/lib/auth";
import { ApiError } from "@/lib/api";

// Registration mirrors the API's rules (backend/src/validators/authValidator):
// email valid and <=320 chars, username 3-50 of letters/digits/_/., password
// 8-128. Server field errors still win when they arrive.

const safeNext = (value: string | null): string => {
    if (!value) return "/";
    if (!value.startsWith("/") || value.startsWith("//")) return "/";
    return value;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_RE = /^[a-zA-Z0-9_.]+$/;

type Errors = Record<string, string>;

function RegisterForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { register } = useAuth();

    const next = safeNext(searchParams.get("next"));

    const [email, setEmail] = useState("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [birthDate, setBirthDate] = useState("");
    const [errors, setErrors] = useState<Errors>({});
    const [formError, setFormError] = useState("");
    const [sending, setSending] = useState(false);

    const validate = (): Errors => {
        const found: Errors = {};
        const mail = email.trim();
        const name = username.trim();

        if (!mail) found.email = "Enter your email";
        else if (!EMAIL_RE.test(mail) || mail.length > 320) found.email = "Enter a valid email";

        if (!name) found.username = "Choose a username";
        else if (name.length < 3 || name.length > 50 || !USERNAME_RE.test(name))
            found.username = "3 to 50 characters: letters, numbers, _ and .";

        if (!password) found.password = "Choose a password";
        else if (password.length < 8 || password.length > 128)
            found.password = "Password must be at least 8 characters";

        if (confirm !== password) found.confirm = "Both passwords must match";

        return found;
    };

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        const found = validate();
        setErrors(found);
        setFormError("");
        if (Object.keys(found).length > 0) return;

        setSending(true);
        try {
            await register({
                email: email.trim(),
                username: username.trim(),
                password,
                ...(birthDate ? { birthDate } : {}),
            });
            router.replace(next);
        } catch (error) {
            if (error instanceof ApiError) {
                setErrors(error.fieldErrors);
                setFormError(error.message);
            } else {
                setFormError("Could not reach the store. Try again in a moment.");
            }
            setSending(false);
        }
    };

    return (
        <form onSubmit={submit} noValidate>
            <p className="kicker text-fg-faint">Account</p>
            <h1 className="display-expanded mt-3 text-2xl font-semibold">Create an account</h1>
            <p className="mt-3 text-sm text-fg-muted">
                One account holds your library, orders and wishlist.
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
                    error={errors.email}
                    placeholder="you@example.com"
                    required
                />
                <Input
                    label="Username"
                    autoComplete="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    error={errors.username}
                    hint="3 to 50 characters. Letters, numbers, _ and ."
                    placeholder="your.handle"
                    required
                />
                <Input
                    label="Password"
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    error={errors.password}
                    hint="At least 8 characters."
                    placeholder="At least 8 characters"
                    required
                />
                <Input
                    label="Confirm password"
                    type="password"
                    autoComplete="new-password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    error={errors.confirm}
                    placeholder="Type it again"
                    required
                />
                <Input
                    label="Date of birth (optional)"
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    error={errors.birthDate}
                    hint="Kept on your account only. No age gate on the store today."
                />
            </div>

            <div className="mt-6">
                <Button type="submit" block loading={sending}>
                    Create account
                </Button>
            </div>

            <p className="mt-5 text-center text-sm text-fg-muted">
                Already have one?{" "}
                <Link
                    href={`/login${next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`}
                    className="link-underline text-fg hover:text-accent"
                >
                    Sign in
                </Link>
            </p>
        </form>
    );
}

export default function RegisterPage() {
    return (
        <Suspense fallback={null}>
            <RegisterForm />
        </Suspense>
    );
}
