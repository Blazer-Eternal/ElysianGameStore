import jwt from "jsonwebtoken";

import { jwtSecret, accessTokenTtl } from "../config";

export interface AccessTokenPayload {
    sub: string; // user id
    role: string;
    email: string;
}

export const signAccessToken = (payload: AccessTokenPayload): string =>
    jwt.sign(payload, jwtSecret, {
        expiresIn: accessTokenTtl as jwt.SignOptions["expiresIn"],
    });

export const verifyAccessToken = (token: string): AccessTokenPayload =>
    jwt.verify(token, jwtSecret) as AccessTokenPayload;
