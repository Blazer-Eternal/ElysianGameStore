// Navigation and label constants. Kept out of components so copy decisions
// are made in one place.

export interface NavItem {
    label: string;
    href: string;
}

export const PRIMARY_NAV: NavItem[] = [
    { label: "Store", href: "/games" },
    { label: "New releases", href: "/games?sort=newest" },
    { label: "Top rated", href: "/games?sort=top_rated" },
    { label: "Deals", href: "/games?sort=price_asc" },
];

export const FOOTER_NAV: Array<{ title: string; items: NavItem[] }> = [
    {
        title: "Store",
        items: [
            { label: "All games", href: "/games" },
            { label: "New releases", href: "/games?sort=newest" },
            { label: "Top rated", href: "/games?sort=top_rated" },
            { label: "Wishlist", href: "/wishlist" },
        ],
    },
    {
        title: "Account",
        items: [
            { label: "Library", href: "/library" },
            { label: "Orders", href: "/orders" },
            { label: "Cart", href: "/cart" },
            { label: "Sign in", href: "/login" },
        ],
    },
    {
        title: "Support",
        items: [
            { label: "Refund policy", href: "/policies/refunds" },
            { label: "Privacy", href: "/policies/privacy" },
            { label: "Terms", href: "/policies/terms" },
        ],
    },
];

export const PAYMENT_PROVIDERS = ["eSewa", "Khalti", "ConnectIPS", "IME Pay"] as const;

export const SORT_OPTIONS = [
    { value: "newest", label: "Newest" },
    { value: "relevance", label: "Relevance" },
    { value: "price_asc", label: "Price: low to high" },
    { value: "price_desc", label: "Price: high to low" },
    { value: "top_rated", label: "Top rated" },
    { value: "trending", label: "Trending" },
] as const;

export const AGE_RATING_LABELS: Record<string, string> = {
    ALL: "All ages",
    E10: "Everyone 10+",
    T: "Teen",
    M: "Mature 17+",
    AO: "Adults only",
};

export const SITE = {
    name: "Elysian",
    tagline: "PC games, delivered to your library",
    domain: "elysian.com.np",
} as const;
