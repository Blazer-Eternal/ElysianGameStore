import { NextFunction, Request, Response } from "express";

import AppError from "../utils/appError";

// Central error handler: every thrown AppError (and any unexpected error)
// leaves the API as { success: false, message, details? }. 5xx errors are
// logged; 4xx are expected and stay quiet.
//
// One class of unexpected error is normalised first: Postgres 22P02
// ("invalid input syntax for type uuid") means a route param such as
// /games/:id was not a UUID. That is a client input error, not a server
// fault, so it becomes a 400 in the standard envelope instead of a 500
// leaking SQL to the caller.
export const errorHandler = (
    err: Error | AppError,
    _req: Request,
    res: Response,
    next: NextFunction,
): void => {
    if (res.headersSent) return next(err);

    const pgCode = (
        err as unknown as { original?: { code?: string } }
    )?.original?.code;
    if (pgCode === "22P02") {
        res.status(400).json({
            success: false,
            message: "Invalid identifier format",
            code: "BAD_REQUEST",
        });
        return;
    }
    // PG 23505 unique_violation: two concurrent requests raced past an
    // application-level "already exists" check (e.g. duplicate refund on the
    // same order item). The database constraint is the source of truth, so
    // surface it as a clean 409 instead of a 500.
    if (pgCode === "23505") {
        res.status(409).json({
            success: false,
            message: "Resource already exists",
            code: "CONFLICT",
        });
        return;
    }

    const statusCode =
        err instanceof AppError
            ? err.statusCode
            : ((err as unknown as { statusCode?: number }).statusCode ?? 500);

    if (statusCode >= 500) {
        console.error("Unhandled error:", err);
    }

    res.status(statusCode).json({
        success: false,
        message: err.message || "Internal server error",
        ...(err instanceof AppError && err.code ? { code: err.code } : {}),
        ...(err instanceof AppError && err.details !== undefined ? { details: err.details } : {}),
    });
};

export default errorHandler;
