// Types mirroring the backend's public API responses (integer paisa, snake_
// case only where the backend actually returns it). Keep in step with
// backend/src/interfaces — these describe what the storefront consumes.

export type AgeRating = "E" | "T" | "M" | "AO";
export type Role = "CUSTOMER" | "PUBLISHER" | "ADMIN";
export type GameStatus = "DRAFT" | "IN_REVIEW" | "PUBLISHED" | "DELISTED";

/* ------------------------------------------------------------------ auth */

export interface User {
    id: string;
    email: string;
    username: string;
    role: Role;
    status?: string;
    birthDate?: string | null;
    countryCode?: string | null;
    createdAt?: string;
}

export interface AuthPayload {
    user: User;
    accessToken: string;
}

/* --------------------------------------------------------------- catalog */

export interface GameSummary {
    id: string;
    title: string;
    slug: string;
    shortDesc: string;
    ageRating: AgeRating;
    basePricePaisa: number;
    releaseDate: string | null;
    isEarlyAccess: boolean;
    publisherName: string | null;
    coverUrl: string | null;
    reviewCount: number;
    recommendRatio: number | null;
    trendingScore: number;
}

export interface SearchResponse {
    games: GameSummary[];
    total: number;
    page: number;
    pageSize: number;
}

export interface Genre {
    id: string;
    name: string;
    slug: string;
}

export interface Tag {
    id: string;
    name: string;
    slug: string;
}

export interface GameMedia {
    id: string;
    gameId: string;
    type: "COVER" | "SCREENSHOT" | "TRAILER";
    url: string;
    sortOrder: number;
}

export interface SystemRequirement {
    id?: string;
    gameId?: string;
    /** Backend codes: MIN (minimum), REC (recommended). */
    type: "MIN" | "REC";
    os: string | null;
    cpu: string | null;
    gpu: string | null;
    ramGb: number | null;
    storageGb: number | null;
    directx: string | null;
}

export interface GameBuildSummary {
    id: string;
    version: string;
    platform: string;
    fileSizeBytes: number;
    checksumSha256: string;
}

export interface PriceSummary {
    basePricePaisa: number;
    promoDiscountPaisa: number;
    currentPricePaisa: number;
    promotionId: string | null;
    taxRateBps: number;
}

export interface GameDetail {
    game: {
        id: string;
        publisherId: string;
        title: string;
        slug: string;
        shortDesc: string;
        longDesc: string | null;
        releaseDate: string | null;
        ageRating: AgeRating;
        basePricePaisa: number;
        currency: string;
        status: GameStatus;
        isEarlyAccess: boolean;
        publishedAt: string | null;
        createdAt: string;
    };
    publisher: {
        id: string;
        name: string;
        legalName?: string;
        status?: string;
        revenueSharePct?: number;
    } | null;
    genres: Genre[];
    tags: Tag[];
    systemRequirements: SystemRequirement[];
    media: GameMedia[];
    builds: GameBuildSummary[];
    price: PriceSummary;
}

/* ------------------------------------------------------------- pricing */

export interface QuoteItem {
    gameId: string;
    title: string;
    slug: string;
    ageRating: AgeRating;
    publisherId: string;
    revenueSharePct: number;
    basePricePaisa: number;
    promotionId: string | null;
    promotionDiscountPaisa: number;
    priceAfterPromoPaisa: number;
    couponDiscountPaisa: number;
    netPaisa: number;
    taxPaisa: number;
}

export interface PriceQuote {
    items: QuoteItem[];
    subtotalPaisa: number;
    promoDiscountPaisa: number;
    couponDiscountPaisa: number;
    discountPaisa: number;
    netPaisa: number;
    taxPaisa: number;
    totalPaisa: number;
    taxRateBps: number;
    couponId: string | null;
}

/* ----------------------------------------------------------------- cart */

export interface CartItem {
    gameId: string;
    title: string;
    slug: string;
    coverUrl: string | null;
    basePricePaisa: number;
    promoDiscountPaisa: number;
    currentPricePaisa: number;
    addedAt: string;
}

export interface Cart {
    cartId: string;
    items: CartItem[];
    subtotalPaisa: number;
    promoDiscountPaisa: number;
    totalBeforeTaxPaisa: number;
    quote: PriceQuote | null;
}

/* --------------------------------------------------------------- orders */

export type OrderStatus =
    | "PENDING"
    | "PAID"
    | "FAILED"
    | "CANCELLED"
    | "EXPIRED"
    | "REFUNDED"
    | "PARTIAL_REFUND";

export type PaymentProvider = "ESEWA" | "KHALTI" | "CONNECTIPS" | "IMEPAY" | "MOCK";

export interface OrderItem {
    id: string;
    orderId: string;
    gameId: string;
    unitPricePaisa: number;
    promotionDiscountPaisa: number;
    couponDiscountPaisa: number;
    discountPaisa: number;
    taxPaisa: number;
    publisherId: string;
    revenueSharePct: number;
    createdAt: string;
}

export interface Order {
    id: string;
    userId: string;
    status: OrderStatus;
    subtotalPaisa: number;
    discountPaisa: number;
    taxPaisa: number;
    totalPaisa: number;
    taxRateBps: number;
    couponCode: string | null;
    paymentProvider: PaymentProvider | null;
    giftRecipientEmail: string | null;
    paidAt: string | null;
    expiresAt: string | null;
    createdAt: string;
}

export interface OrderListItem extends Order {
    items?: OrderItem[];
}

export interface OrderListResponse {
    orders: OrderListItem[];
    total: number;
    page: number;
    pageSize: number;
}

export interface CreateOrderResponse {
    orderId: string;
    quote: PriceQuote;
}

export interface PayResponse {
    order: Order;
    redirectUrl?: string | null;
    provider?: PaymentProvider;
    mock?: boolean;
}

/* ------------------------------------------------------------ library */

export interface LibraryEntry {
    id: string;
    gameId: string;
    title: string;
    slug: string;
    coverUrl: string | null;
    source: string;
    revokedAt: string | null;
    acquiredAt: string;
}

/* ------------------------------------------------------------- reviews */

export interface Review {
    id: string;
    userId: string;
    gameId: string;
    recommend: boolean;
    rating: number | null;
    body: string | null;
    playtimeMinutes?: number | null;
    helpfulCount: number;
    moderationStatus: "PENDING" | "APPROVED" | "REJECTED";
    createdAt: string;
    updatedAt: string;
    user?: { id: string; username: string };
}

export interface ReviewListResponse {
    reviews: Review[];
    total: number;
    page: number;
    pageSize: number;
}

/* ---------------------------------------------------------- misc server */

export interface HealthResponse {
    status: string;
    database: string;
    uptime?: number;
}
