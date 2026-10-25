import { NotificationType } from "../enums/notificationTypeEnum";

// PROMOTION rows are fanned out to wishlisters when a promotion starts.
// convertedAt is stamped when the user later buys the promoted game — this is
// how wishlist→sale conversion is tracked.
export interface INotification {
    id: string;
    userId: string;
    type: NotificationType;
    title: string;
    body?: string | null;
    data?: unknown | null;
    readAt?: Date | null;
    convertedAt?: Date | null;
    createdAt: Date;
}

export type INotificationCreation = Omit<INotification, "id" | "createdAt">;
