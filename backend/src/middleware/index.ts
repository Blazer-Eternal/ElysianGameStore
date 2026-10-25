import { NextFunction, Request, Response } from "express";

export * from "./guard";
export * from "./validator";
export * from "./rateLimiter";
export * from "./errorHandler";
export * from "./exceptionHandler";

export const notFoundHandler = (_req: Request, res: Response, _next: NextFunction): void => {
    res.status(404).json({ success: false, message: "Route not found" });
};
