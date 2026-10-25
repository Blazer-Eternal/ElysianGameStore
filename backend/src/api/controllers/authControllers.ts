import { Response } from "express";

import { environment } from "../../config";
import { AppRequest as Request } from "../../interfaces";
import { asyncHandler } from "../../middleware/exceptionHandler";
import { authServices } from "../../services";
import { ACCESS_COOKIE, REFRESH_COOKIE } from "../../services/authServices";
import { sendSuccess } from "../../utils/response";

const REFRESH_MAX_AGE = 7 * 24 * 60 * 60 * 1000;
const ACCESS_MAX_AGE = 15 * 60 * 1000;

const setAuthCookies = (res: Response, accessToken: string, refreshToken: string): void => {
    const secure = environment === "production";
    res.cookie(ACCESS_COOKIE, accessToken, {
        httpOnly: true,
        sameSite: "lax",
        secure,
        maxAge: ACCESS_MAX_AGE,
    });
    // The refresh cookie is scoped to the auth router: it only ever travels
    // to /api/auth/refresh and /api/auth/logout.
    res.cookie(REFRESH_COOKIE, refreshToken, {
        httpOnly: true,
        sameSite: "lax",
        secure,
        path: "/api/auth",
        maxAge: REFRESH_MAX_AGE,
    });
};

export const register = asyncHandler(async (req: Request, res: Response) => {
    const result = await authServices.register(req.body);
    setAuthCookies(res, result.accessToken, result.refreshToken);
    sendSuccess(res, { user: result.user, accessToken: result.accessToken }, "Account created", 201);
});

export const login = asyncHandler(async (req: Request, res: Response) => {
    const result = await authServices.login(req.body, {
        ip: req.ip,
        userAgent: req.headers["user-agent"],
    });
    setAuthCookies(res, result.accessToken, result.refreshToken);
    sendSuccess(res, { user: result.user, accessToken: result.accessToken }, "Logged in");
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
    const token = req.cookies?.[REFRESH_COOKIE] ?? (req.body?.refreshToken as string | undefined);
    const result = await authServices.refresh(token ?? "", {
        ip: req.ip,
        userAgent: req.headers["user-agent"],
    });
    setAuthCookies(res, result.accessToken, result.refreshToken);
    sendSuccess(res, { user: result.user, accessToken: result.accessToken }, "Session refreshed");
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
    const token = req.cookies?.[REFRESH_COOKIE];
    await authServices.logout(token);
    res.clearCookie(ACCESS_COOKIE);
    res.clearCookie(REFRESH_COOKIE, { path: "/api/auth" });
    sendSuccess(res, null, "Logged out");
});

export const me = asyncHandler(async (req: Request, res: Response) => {
    const user = await authServices.getMe(req.user!.sub);
    sendSuccess(res, { user });
});
