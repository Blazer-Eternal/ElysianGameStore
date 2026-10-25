import { NextFunction, Request, RequestHandler, Response } from "express";

// Wraps async controllers so rejected promises reach errorHandler instead of
// crashing the process (Express 5 catches sync throws only). The constraint
// accepts `Request<any>` so handlers may narrow the params type (see
// AppRequest in interfaces/customRequestInterface) while `req.user`,
// `req.rawBody` etc. stay available.
export const asyncHandler =
    <T extends (req: Request<any>, res: Response, next: NextFunction) => Promise<unknown>>(fn: T) =>
    (req: Request, res: Response, next: NextFunction): void => {
        void Promise.resolve(fn(req, res, next)).catch(next);
    };

export default asyncHandler as (fn: never) => RequestHandler;
