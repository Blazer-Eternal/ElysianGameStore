import { NotificationType } from "../enums/notificationTypeEnum";
import { INotificationCreation } from "../interfaces/notificationInterface";
import { NotificationRepository } from "../repositories";
import AppError from "../utils/appError";

export const send = async (
    userId: string,
    type: NotificationType,
    title: string,
    body?: string,
    data?: unknown,
    transaction?: unknown,
) =>
    NotificationRepository.create(
        {
            userId,
            type,
            title,
            body: body ?? null,
            data: data ?? null,
            readAt: null,
            convertedAt: null,
        } as INotificationCreation,
        transaction as never,
    );

export const list = async (
    userId: string,
    params: { page: number; pageSize: number; unreadOnly?: boolean },
) => {
    const { rows, count } = await NotificationRepository.listByUser(userId, {
        limit: params.pageSize,
        offset: (params.page - 1) * params.pageSize,
        unreadOnly: params.unreadOnly,
    });
    return {
        notifications: rows,
        total: count,
        page: params.page,
        pageSize: params.pageSize,
    };
};

export const markRead = async (userId: string, notificationId: string) => {
    const updated = await NotificationRepository.markRead(notificationId, userId);
    if (updated === 0) throw AppError.notFound("Notification not found");
};

export const markAllRead = async (userId: string): Promise<number> =>
    NotificationRepository.markAllRead(userId);
