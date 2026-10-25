// Central error type. Thrown anywhere in services/controllers and converted
// to a JSON envelope { success: false, message, details? } by errorHandler.
class AppError extends Error {
    public statusCode: number;
    public code: string;
    public details?: unknown;
    public isOperational: boolean;

    constructor(
        message: string,
        statusCode: number = 400,
        code: string = "APP_ERROR",
        details?: unknown,
    ) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }

    static badRequest(message: string, details?: unknown) {
        return new AppError(message, 400, "BAD_REQUEST", details);
    }
    static unauthorized(message: string = "Authentication required") {
        return new AppError(message, 401, "UNAUTHORIZED");
    }
    static forbidden(message: string = "You do not have permission to do that") {
        return new AppError(message, 403, "FORBIDDEN");
    }
    static notFound(message: string = "Resource not found") {
        return new AppError(message, 404, "NOT_FOUND");
    }
    static conflict(message: string, details?: unknown) {
        return new AppError(message, 409, "CONFLICT", details);
    }
}

export default AppError;
