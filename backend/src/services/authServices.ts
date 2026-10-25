import bcrypt from "bcryptjs";
import { createHash } from "crypto";

import { accessTokenTtl, refreshTokenTtl } from "../config";
import { Role } from "../enums/roleEnum";
import { UserStatus } from "../enums/userStatusEnum";
import { IUser, IUserPublic } from "../interfaces/userInterface";
import Session from "../models/sessionModel";
import User from "../models/userModel";
import SessionRepository from "../repositories/sessionRepository";
import UserRepository from "../repositories/userRepository";
import AppError from "../utils/appError";
import { signAccessToken } from "../utils/token";

const REFRESH_TTL_MS = (() => {
    const unit = refreshTokenTtl.slice(-1);
    const value = Number(refreshTokenTtl.slice(0, -1)) || 7;
    const units: Record<string, number> = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
    return value * (units[unit] ?? 86400000);
})();

export const hashRefreshToken = (token: string): string =>
    createHash("sha256").update(token).digest("hex");

export const toPublicUser = (user: User | IUser): IUserPublic => {
    const u = user as User;
    return {
        id: u.id,
        email: u.email,
        username: u.username,
        role: u.role,
        countryCode: u.countryCode ?? null,
        birthDate: u.birthDate ?? null,
        status: u.status,
        emailVerifiedAt: u.emailVerifiedAt ?? null,
        createdAt: u.createdAt,
    };
};

const issueSession = async (
    user: User,
    meta: { ip?: string; userAgent?: string },
): Promise<{ accessToken: string; refreshToken: string; session: Session }> => {
    const refreshToken = createHash("sha256")
        .update(`${user.id}:${Date.now()}:${Math.random()}`)
        .update(createHash("sha256").update(String(Math.random())).digest("hex"))
        .digest("hex");

    const session = await SessionRepository.create({
        userId: user.id,
        refreshTokenHash: hashRefreshToken(refreshToken),
        userAgent: meta.userAgent?.slice(0, 255) ?? null,
        ip: meta.ip ?? null,
        expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
        revokedAt: null,
    });

    const accessToken = signAccessToken({
        sub: user.id,
        role: user.role,
        email: user.email,
    });

    return { accessToken, refreshToken, session };
};

export const register = async (input: {
    email: string;
    username: string;
    password: string;
    birthDate?: Date;
    countryCode?: string;
}): Promise<{ user: IUserPublic; accessToken: string; refreshToken: string }> => {
    const email = input.email.toLowerCase();
    const username = input.username.toLowerCase();

    if (await UserRepository.emailExists(email)) {
        throw AppError.conflict("An account with this email already exists");
    }
    if (await UserRepository.usernameExists(username)) {
        throw AppError.conflict("This username is taken");
    }

    const user = await UserRepository.create({
        email,
        username,
        passwordHash: await bcrypt.hash(input.password, 10),
        role: Role.CUSTOMER,
        countryCode: input.countryCode ?? null,
        birthDate: input.birthDate ?? null,
        status: UserStatus.ACTIVE,
        emailVerifiedAt: null,
    });

    const tokens = await issueSession(user, {});
    return { user: toPublicUser(user), ...tokens };
};

export const login = async (
    input: { email: string; password: string },
    meta: { ip?: string; userAgent?: string },
): Promise<{ user: IUserPublic; accessToken: string; refreshToken: string }> => {
    const user = await UserRepository.findByEmail(input.email.toLowerCase());
    // Same error for unknown email and bad password (no account enumeration).
    const invalid = AppError.unauthorized("Invalid email or password");
    if (!user) throw invalid;

    const valid = await bcrypt.compare(input.password, user.passwordHash);
    if (!valid) throw invalid;

    if (user.status === UserStatus.SUSPENDED) {
        throw AppError.forbidden("This account is suspended. Contact support.");
    }
    if (user.status === UserStatus.DELETED) {
        throw AppError.forbidden("This account is no longer available");
    }

    const tokens = await issueSession(user, meta);
    return { user: toPublicUser(user), ...tokens };
};

// Refresh-token rotation: the presented token is verified against its hash,
// revoked, and replaced with a fresh pair. A revoked/stolen token fails.
export const refresh = async (
    refreshToken: string,
    meta: { ip?: string; userAgent?: string },
): Promise<{ user: IUserPublic; accessToken: string; refreshToken: string }> => {
    const session = await SessionRepository.findByHash(hashRefreshToken(refreshToken));
    if (!session || session.revokedAt || session.expiresAt.getTime() < Date.now()) {
        throw AppError.unauthorized("Invalid or expired session");
    }

    const user = await UserRepository.findById(session.userId);
    if (!user || user.status !== UserStatus.ACTIVE) {
        throw AppError.unauthorized("Account is not active");
    }

    await SessionRepository.revoke(session.id);
    const tokens = await issueSession(user, meta);
    return { user: toPublicUser(user), ...tokens };
};

export const logout = async (refreshToken: string | undefined): Promise<void> => {
    if (!refreshToken) return;
    const session = await SessionRepository.findByHash(hashRefreshToken(refreshToken));
    if (session) await SessionRepository.revoke(session.id);
};

export const logoutAll = async (userId: string): Promise<number> =>
    SessionRepository.revokeAllForUser(userId);

export const getMe = async (userId: string): Promise<IUserPublic> => {
    const user = await UserRepository.findById(userId);
    if (!user) throw AppError.notFound("User not found");
    return toPublicUser(user);
};

export const ACCESS_COOKIE = "elysian_access";
export const REFRESH_COOKIE = "elysian_refresh";
export { accessTokenTtl };
