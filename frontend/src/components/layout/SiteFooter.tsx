import Link from "next/link";

import { CurrentYear } from "@/components/ui/CurrentYear";
import { FOOTER_NAV, PAYMENT_PROVIDERS, SITE } from "@/constants/nav";

// Editorial footer: hairline columns, mono heads, factual copy. No newsletter
// dark patterns, no social icon row for the sake of it.
export function SiteFooter() {
    return (
        <footer className="mt-auto border-t border-line bg-bg">
            <div className="mx-auto w-full max-w-[84rem] px-4 sm:px-6 lg:px-10">
                <div className="grid grid-cols-2 gap-x-6 gap-y-10 py-12 md:grid-cols-4 lg:py-16">
                    <div className="col-span-2 md:col-span-1">
                        <p className="display-expanded text-lg font-bold uppercase tracking-[0.06em]">
                            {SITE.name}
                        </p>
                        <p className="mt-3 max-w-56 text-sm leading-relaxed text-fg-muted">
                            {SITE.tagline}. Built in Kathmandu for PC players across Nepal.
                        </p>
                    </div>

                    {FOOTER_NAV.map((column) => (
                        <nav key={column.title} aria-label={column.title}>
                            <p className="kicker text-fg-faint">{column.title}</p>
                            <ul className="mt-4 space-y-2.5">
                                {column.items.map((item) => (
                                    <li key={item.label}>
                                        <Link
                                            href={item.href}
                                            className="link-underline text-sm text-fg-muted hover:text-fg"
                                        >
                                            {item.label}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </nav>
                    ))}
                </div>

                <div className="flex flex-col gap-4 border-t border-line py-6 md:flex-row md:items-center md:justify-between">
                    <p className="kicker text-fg-faint">
                        Payments: {PAYMENT_PROVIDERS.join(" · ")}
                    </p>
                    <p className="text-xs text-fg-faint">
                        © <CurrentYear /> {SITE.name} Interactive Pvt. Ltd. · All prices
                        include 13% VAT.
                    </p>
                </div>
            </div>
        </footer>
    );
}
