import { Response } from "express";

import { AppRequest as Request } from "../../interfaces";
import { asyncHandler } from "../../middleware/exceptionHandler";
import { notificationServices } from "../../services";
import { sendSuccess } from "../../utils/response";

export const listNotifications = asyncHandler(async (req: Request, res: Response) => {
    const q = req.query as Record<string, string | boolean | undefined>;
    const result = await notificationServices.list(req.user!.sub, {
        page: Number(q.page ?? 1),
        pageSize: Number(q.pageSize ?? 12),
        unreadOnly: q.unreadOnly === true,
    });
    sendSuccess(res, result);
});

export const unreadCount = asyncHandler(async (req: Request, res: Response) => {
    const { total } = await notificationServices.list(req.user!.sub, {
        page: 1,
        pageSize: 1,
        unreadOnly: true,
    });
    sendSuccess(res, { unread: total });
});

export const markRead = asyncHandler(async (req: Request, res: Response) => {
    await notificationServices.markRead(req.user!.sub, String(req.params.id));
    sendSuccess(res, null, "Notification marked as read");
});

export const markAllRead = asyncHandler(async (req: Request, res: Response) => {
    const updated = await notificationServices.markAllRead(req.user!.sub);
    sendSuccess(res, { updated }, "All notifications marked as read");
});
