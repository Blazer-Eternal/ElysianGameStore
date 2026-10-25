import { NextFunction, Request, Response } from "express";
import { ZodType } from "zod";

import AppError from "../utils/appError";

// Zod validation middleware. On success the parsed (and coerced/trimmed)
// value replaces the raw input, so downstream code can trust its types.
export const validate =
    (schema: ZodType, source: "body" | "query" | "params" = "body") =>
    (req: Request, _res: Response, next: NextFunction): void => {
        const result = schema.safeParse(req[source]);
        if (!result.success) {
            const details = result.error.issues.map((issue) => ({
                path: issue.path.join("."),
                message: issue.message,
            }));
            return next(AppError.badRequest("Validation failed", details));
        }
        if (source === "body") req.body = result.data;
        if (source === "query") {
            // Express 5 exposes req.query as a getter-only accessor on the
            // request prototype: a plain assignment throws a TypeError in
            // strict mode (and would be ignored anyway), so shadow it with an
            // own writable property before replacing the parsed value.
            Object.defineProperty(req, "query", {
                value: result.data,
                writable: true,
                enumerable: true,
                configurable: true,
            });
        }
        if (source === "params") (req as unknown as { params: unknown }).params = result.data;
        next();
    };

export default validate;
