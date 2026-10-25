import { NextFunction, Request, Response } from "express";

import { Role } from "../enums/roleEnum";
import { UserStatus } from "../enums/userStatusEnum";
import AppError from "../utils/appError";
import { verifyAccessToken } from "../utils/token";
import { ACCESS_COOKIE } from "../services/authServices";
import { Action, assertCan } from "../services/accessControl";
import UserRepository from "../repositories/userRepository";

// Reads the JWT from the Authorization header or the HTTP-only cookie and
// attaches req.user. Never throws — failures become 401 via next(err).
//
// The token is only the *identity* claim: role and status are re-read from
// the database on every authenticated request so privilege changes take
// effect immediately — a publisher upgrade (apply), an admin role change or
// a suspension must not wait for the 15-minute JWT to expire.
export const authenticate = (req: Request, _res: Response, next: NextFunction): void => {
    const header = req.headers.authorization;
    const bearer = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
    const token = bearer ?? req.cookies?.[ACCESS_COOKIE];

    if (!token) return next(AppError.unauthorized());

    let payload: { sub: string; role: string; email: string };
    try {
        payload = verifyAccessToken(token);
    } catch {
        return next(AppError.unauthorized("Invalid or expired token"));
    }

    void (async () => {
        const user = await UserRepository.findById(payload.sub);
        if (!user) throw AppError.unauthorized("Invalid or expired token");
        if (user.status === UserStatus.DELETED) throw AppError.unauthorized("Account is not active");
        if (user.status !== UserStatus.ACTIVE) throw AppError.unauthorized("Account is not active");
        req.user = { sub: user.id, role: user.role, email: user.email };
        next();
    })().catch((error) => next(error instanceof AppError ? error : AppError.unauthorized()));
};

// Like authenticate but leaves req.user undefined when no/invalid token —
// used for endpoints with optional personalization. Personalization is
// cosmetic (owned/wishlisted badges), so the cheaper token-only path applies.
export const optionalAuth = (req: Request, _res: Response, next: NextFunction): void => {
    const header = req.headers.authorization;
    const bearer = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
    const token = bearer ?? req.cookies?.[ACCESS_COOKIE];
    if (token) {
        try {
            req.user = verifyAccessToken(token);
        } catch {
            // ignore — treat as anonymous
        }
    }
    next();
};

export const requireRole =
    (...roles: Role[]) =>
    (req: Request, _res: Response, next: NextFunction): void => {
        if (!req.user) return next(AppError.unauthorized());
        if (!roles.includes(req.user.role as Role)) {
            return next(AppError.forbidden());
        }
        next();
    };

// Coarse RBAC from accessControl; ownership rules are asserted in services.
export const requireAction =
    (action: Action) =>
    (req: Request, _res: Response, next: NextFunction): void => {
        if (!req.user) return next(AppError.unauthorized());
        try {
            assertCan(req.user.role as Role, action);
            next();
        } catch (error) {
            next(error);
        }
    };

/** Convenience for controllers that need the authenticated actor. */
export const actorOf = (req: Request): { id: string; role: Role } => {
    if (!req.user) throw AppError.unauthorized();
    return { id: req.user.sub, role: req.user.role as Role };
};
