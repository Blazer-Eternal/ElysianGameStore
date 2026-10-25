import dotenv from "dotenv";

dotenv.config();

export const port = process.env.PORT || "5000";

export const environment = process.env.ENVIRONMENT;

export const db = {
    host: process.env.DB_HOST,
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    name: process.env.DB_NAME || "ElysianGameStore",
    port: process.env.DB_PORT || "5432",
    dialect: process.env.DB_DIALECT || "postgres",
} as {
    host: string;
    username: string;
    password: string;
    name: string;
    port: string;
    dialect: string;
};

export const jwtSecret = process.env.JWT_SECRET_KEY as string;

// Comma-separated list of browser origins allowed to call the API (CORS).
// Must be set for production deployments; unset falls back to dev defaults.
export const clientUrl = process.env.CLIENT_URL;

// JWT access tokens are short-lived; longer sessions live in the sessions
// table as opaque refresh tokens (see authServices).
export const accessTokenTtl = process.env.ACCESS_TOKEN_TTL || "15m";
export const refreshTokenTtl = process.env.REFRESH_TOKEN_TTL || "7d";

// Rate limits are per IP. Tunable through .env without code changes.
export const rateLimitConfig = {
    windowMin: Number(process.env.RATE_LIMIT_WINDOW_MIN) || 15,
    max: Number(process.env.RATE_LIMIT_MAX) || 600,
    authMax: Number(process.env.AUTH_RATE_LIMIT_MAX) || 30,
    loginMax: Number(process.env.LOGIN_RATE_LIMIT_MAX) || 10,
    sensitiveMax: Number(process.env.SENSITIVE_RATE_LIMIT_MAX) || 10,
};

// ---------------------------------------------------------------------------
// Payments — provider-agnostic stub layer.
// PAYMENT_PROVIDER_MODE=mock wires signed stub adapters for eSewa, Khalti,
// ConnectIPS and IME Pay. Real sandbox adapters implement the same interface
// and are selected here once credentials exist.
// ---------------------------------------------------------------------------
export const paymentConfig = {
    mode: process.env.PAYMENT_PROVIDER_MODE || "mock",
    webhookSecret: process.env.WEBHOOK_SECRET || "dev-webhook-secret",
    mockBaseUrl: process.env.MOCK_PAYMENT_BASE_URL || "http://localhost:5000/api/orders",
    // Dev-only shortcut that simulates a provider callback (never enable in prod).
    enableMockPayments: (process.env.ENABLE_MOCK_PAYMENTS || "true") === "true",
};

// Downloads are delivered as short-lived signed CDN URLs (anti-piracy guard:
// the license is checked server-side, the URL itself expires quickly).
export const cdnConfig = {
    baseUrl: process.env.CDN_BASE_URL || "http://localhost:9000/elysian-builds",
    signingSecret: process.env.CDN_SIGNING_SECRET || "dev-cdn-secret",
    signTtlSec: Number(process.env.CDN_SIGN_TTL_SEC) || 300,
};

// Business rules, all expressed in integer paisa / minutes / days.
export const commerceConfig = {
    refundWindowDays: Number(process.env.REFUND_WINDOW_DAYS) || 14,
    refundPlaytimeMinutes: Number(process.env.REFUND_PLAYTIME_MINUTES) || 120,
    pendingOrderTtlHours: Number(process.env.PENDING_ORDER_TTL_HOURS) || 24,
    payoutHoldDays: Number(process.env.PAYOUT_HOLD_DAYS) || 30,
    // Stub FX snapshot rate used when generating USD payouts for foreign
    // publishers (NPR per 1 USD). Replace with a real FX feed later.
    fxRateUsdNpr: Number(process.env.FX_RATE_USD_NPR) || 133.5,
};

export const sweepIntervalMs = Number(process.env.SWEEP_INTERVAL_MS) || 60000;
