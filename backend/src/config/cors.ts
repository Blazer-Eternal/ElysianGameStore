import { CorsOptions } from "cors";
import { clientUrl, environment } from "./env";

// Origins used when CLIENT_URL is not configured: only common local dev
// frontends. Production without CLIENT_URL gets an empty list, i.e. no
// cross-origin browser access at all (same-origin and non-browser clients,
// such as curl or Postman, are unaffected — they send no `Origin` header).
const DEV_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
];

const parseClientUrls = (): string[] =>
    (clientUrl ?? "")
        .split(",")
        .map((origin) => origin.trim().replace(/\/+$/, ""))
        .filter(Boolean);

export const allowedOrigins: string[] =
    parseClientUrls().length > 0
        ? parseClientUrls()
        : environment === "production"
          ? []
          : DEV_ORIGINS;

export const corsOptions: CorsOptions = {
    origin(origin, callback) {
        // No Origin header: same-origin, curl, Postman, server-to-server → allow.
        if (!origin) return callback(null, true);
        // Unknown origin: allow the request through but set no CORS headers,
        // so the browser blocks reading the response (and blocks preflights).
        return callback(null, allowedOrigins.includes(origin));
    },
    credentials: true,
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Idempotency-Key", "X-Elysian-Signature"],
    maxAge: 600, // cache preflights for 10 minutes
};
