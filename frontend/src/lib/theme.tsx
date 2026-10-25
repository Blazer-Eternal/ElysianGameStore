"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

// Dark-first: the store opens on the dark stock. The choice persists per
// browser and is applied before hydration by an inline script in the root
// layout, so there is no theme flash on load.

type Theme = "dark" | "light";

const STORAGE_KEY = "elysian-theme";

interface ThemeContextValue {
    theme: Theme;
    setTheme: (theme: Theme) => void;
    toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setThemeState] = useState<Theme>("dark");

    useEffect(() => {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        if (stored === "dark" || stored === "light") setThemeState(stored);
    }, []);

    const setTheme = useCallback((next: Theme) => {
        setThemeState(next);
        window.localStorage.setItem(STORAGE_KEY, next);
        document.documentElement.classList.toggle("dark", next === "dark");
    }, []);

    const toggle = useCallback(() => {
        setTheme(document.documentElement.classList.contains("dark") ? "light" : "dark");
    }, [setTheme]);

    const value = useMemo(() => ({ theme, setTheme, toggle }), [theme, setTheme, toggle]);

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
    const ctx = useContext(ThemeContext);
    if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
    return ctx;
}
