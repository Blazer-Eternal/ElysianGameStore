import rateLimit from "express-rate-limit";

import { rateLimitConfig } from "../config";

const windowMs = rateLimitConfig.windowMin * 60 * 1000;

const build = (max: number, name: string) =>
    rateLimit({
        windowMs,
        max,
        standardHeaders: true, // RateLimit-* draft headers
        legacyHeaders: false,
        message: {
            success: false,
            message: `Too many requests (${name}), please slow down.`,
        },
    });

// Global limiter plus tighter ones on auth and other sensitive routes — all
// per IP and tunable through .env (see env.ts rateLimitConfig).
export const globalLimiter = build(rateLimitConfig.max, "global");
export const authLimiter = build(rateLimitConfig.authMax, "auth");
export const loginLimiter = build(rateLimitConfig.loginMax, "login");
export const sensitiveLimiter = build(rateLimitConfig.sensitiveMax, "sensitive");
