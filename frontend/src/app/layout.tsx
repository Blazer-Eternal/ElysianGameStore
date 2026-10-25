import type { Metadata } from "next";

import "@fontsource-variable/archivo/wdth.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "@fontsource/ibm-plex-mono/600.css";
import "./globals.css";

import { AuthProvider } from "@/lib/auth";
import { ThemeProvider } from "@/lib/theme";
import { SITE } from "@/constants/nav";

export const metadata: Metadata = {
    title: {
        default: `${SITE.name} — PC games for Nepal`,
        template: `%s · ${SITE.name}`,
    },
    description:
        "Buy PC games in Nepal. Pay with eSewa, Khalti, ConnectIPS or IME Pay. Keys and downloads land in your library the moment payment clears.",
};

// Applies the stored theme before first paint so the dark-first default never
// flashes. Kept inline and tiny on purpose; the provider picks it up after.
const themeScript = `(function(){try{var t=localStorage.getItem("elysian-theme");if(t==="light"){document.documentElement.classList.remove("dark")}else{document.documentElement.classList.add("dark")}}catch(e){}})();`;

// Shell only: route groups own their chrome ((public) gets header/footer,
// (auth) gets a minimal frame), so both can differ without prop drilling.
export default function RootLayout({ children }: LayoutProps<"/">) {
    return (
        <html lang="en" className="dark" suppressHydrationWarning>
            <head>
                <script dangerouslySetInnerHTML={{ __html: themeScript }} />
            </head>
            <body className="flex min-h-screen flex-col">
                <ThemeProvider>
                    <AuthProvider>{children}</AuthProvider>
                </ThemeProvider>
            </body>
        </html>
    );
}
