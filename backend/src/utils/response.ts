import { Response } from "express";

// Uniform response envelope for every endpoint:
//   success: { success: true, message, data }
//   failure: { success: false, message, details? }  (see errorHandler)
export const sendSuccess = <T>(
    res: Response,
    data: T,
    message: string = "OK",
    status: number = 200,
): Response =>
    res.status(status).json({
        success: true,
        message,
        data,
    });

export default sendSuccess;
