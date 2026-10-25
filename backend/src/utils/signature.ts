import { createHmac, timingSafeEqual } from "crypto";

import { cdnConfig, paymentConfig } from "../config";

// ---------------------------------------------------------------------------
// Webhook signatures (x-elysian-signature: sha256=<hex>). The same HMAC scheme
// is used by the mock adapters and expected from real providers, so switching
// PAYMENT_PROVIDER_MODE does not change webhook verification code.
// ---------------------------------------------------------------------------
export const signPayload = (rawBody: Buffer | string, secret: string = paymentConfig.webhookSecret): string =>
    `sha256=${createHmac("sha256", secret).update(rawBody).digest("hex")}`;

export const verifySignature = (
    rawBody: Buffer | string,
    signature: string | undefined,
    secret: string = paymentConfig.webhookSecret,
): boolean => {
    if (!signature) return false;
    const expected = signPayload(rawBody, secret);
    const a = Buffer.from(expected);
    const b = Buffer.from(signature);
    return a.length === b.length && timingSafeEqual(a, b);
};

// ---------------------------------------------------------------------------
// Signed CDN download URLs. The license check happens server-side; the URL the
// client receives is short-lived and bound to (user, build), so a leaked link
// stops working within minutes and never works for a different account.
// ---------------------------------------------------------------------------
export interface CdnClaim {
    userId: string;
    buildId: string;
    expires: number; // unix seconds
}

const claimSignature = (claim: CdnClaim): string =>
    createHmac("sha256", cdnConfig.signingSecret)
        .update(`${claim.userId}:${claim.buildId}:${claim.expires}`)
        .digest("base64url");

export const signCdnUrl = (userId: string, buildId: string, fileName: string): { url: string; expiresAt: Date } => {
    const expires = Math.floor(Date.now() / 1000) + cdnConfig.signTtlSec;
    const claim: CdnClaim = { userId, buildId, expires };
    const sig = claimSignature(claim);
    const url =
        `${cdnConfig.baseUrl}/${encodeURIComponent(fileName)}` +
        `?uid=${userId}&bid=${buildId}&exp=${expires}&sig=${encodeURIComponent(sig)}`;
    return { url, expiresAt: new Date(expires * 1000) };
};

export const verifyCdnUrl = (params: {
    userId: string;
    buildId: string;
    exp: number;
    sig: string;
}): boolean => {
    if (!params.exp || params.exp * 1000 < Date.now()) return false;
    const expected = claimSignature({
        userId: params.userId,
        buildId: params.buildId,
        expires: params.exp,
    });
    const a = Buffer.from(expected);
    const b = Buffer.from(params.sig);
    return a.length === b.length && timingSafeEqual(a, b);
};
