import { Request as ExpressRequest } from "express";

import { AccessTokenPayload } from "../utils/token";

// Express Request augmented with the authenticated user's JWT payload and the
// raw request body captured for webhook HMAC verification.
declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Express {
        interface Request {
            user?: AccessTokenPayload;
            rawBody?: Buffer;
        }
    }
}

// The @types/express v5 default params dictionary is `string | string[]`
// because Express 5 wildcard params (`*name`) resolve to arrays. Every route
// in this API only uses `:named` segments, whose values are always single
// strings, so controllers are typed with this narrower request.
export type AppRequest = ExpressRequest<Record<string, string>>;
