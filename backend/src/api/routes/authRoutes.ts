import { Router } from "express";

import * as authControllers from "../controllers/authControllers";
import { authenticate, authLimiter, loginLimiter, validate } from "../../middleware";
import { loginSchema, refreshSchema, registerSchema } from "../../validators";

const authRoutes = Router();

// Every credential-touching endpoint is rate limited per IP: registration and
// token refresh on the auth bucket, the login endpoint on its own tighter one.
// Tokens are returned both as an HTTP-only cookie (elysian_access) and in the
// response body, so API clients can use `Authorization: Bearer <accessToken>`.
authRoutes.post("/register", authLimiter, validate(registerSchema), authControllers.register);
authRoutes.post("/login", loginLimiter, validate(loginSchema), authControllers.login);
authRoutes.post("/refresh", authLimiter, validate(refreshSchema), authControllers.refresh);
authRoutes.post("/logout", authControllers.logout);

// Who am I — reads the JWT from the Authorization header or the access cookie.
authRoutes.get("/me", authenticate, authControllers.me);

export default authRoutes;
