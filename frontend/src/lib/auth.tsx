"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { api, ApiError } from "@/lib/api";
import type { AuthPayload, User } from "@/types";

// Session state for the storefront. The backend keeps auth in HTTP-only
// cookies, so the source of truth lives there: on mount we ask /auth/me and
// hydrate. 401 while hydrating simply means "logged out", not an error.

type Status = "loading" | "authenticated" | "anonymous";

interface AuthContextValue {
    user: User | null;
    status: Status;
    login: (email: string, password: string) => Promise<User>;
    register: (input: {
        email: string;
        username: string;
        password: string;
        birthDate?: string;
    }) => Promise<User>;
    logout: () => Promise<void>;
    /** Re-read the session after a token refresh or profile change. */
    refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [status, setStatus] = useState<Status>("loading");

    const hydrate = useCallback(async () => {
        try {
            const data = await api.get<{ user: User }>("/auth/me");
            setUser(data.user);
            setStatus("authenticated");
        } catch (error) {
            // 401 = no/expired session; anything else keeps the app usable.
            if (error instanceof ApiError && error.status === 401) {
                setUser(null);
                setStatus("anonymous");
            } else {
                setUser(null);
                setStatus("anonymous");
            }
        }
    }, []);

    useEffect(() => {
        void hydrate();
    }, [hydrate]);

    const login = useCallback(async (email: string, password: string) => {
        const data = await api.post<AuthPayload>("/auth/login", { email, password }, { noRetry: true });
        setUser(data.user);
        setStatus("authenticated");
        return data.user;
    }, []);

    const register = useCallback(
        async (input: { email: string; username: string; password: string; birthDate?: string }) => {
            const data = await api.post<AuthPayload>("/auth/register", input, { noRetry: true });
            setUser(data.user);
            setStatus("authenticated");
            return data.user;
        },
        [],
    );

    const logout = useCallback(async () => {
        await api.post("/auth/logout", {}, { noRetry: true }).catch(() => undefined);
        setUser(null);
        setStatus("anonymous");
    }, []);

    const value = useMemo(
        () => ({ user, status, login, register, logout, refresh: hydrate }),
        [user, status, login, register, logout, hydrate],
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
    return ctx;
}
