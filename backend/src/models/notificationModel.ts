import { DataTypes, Model, ModelAttributes, Sequelize } from "sequelize";

import { NOTIFICATION_TYPES } from "../enums/notificationTypeEnum";
import { INotification, INotificationCreation } from "../interfaces/notificationInterface";

// In-app notifications. PROMOTION rows are fanned out to wishlisters when a
// promotion starts; convertedAt is stamped when the user later buys the game.
class Notification extends Model<INotification, INotificationCreation> implements INotification {
    declare id: string;
    declare userId: string;
    declare type: INotification["type"];
    declare title: string;
    declare body: string | null;
    declare data: unknown | null;
    declare readAt: Date | null;
    declare convertedAt: Date | null;
    declare readonly createdAt: Date;

    static initModel(sequelize: Sequelize): void {
        Notification.init(
            {
                id: {
                    type: DataTypes.UUID,
                    defaultValue: DataTypes.UUIDV4,
                    primaryKey: true,
                },
                userId: { type: DataTypes.UUID, allowNull: false },
                type: {
                    type: DataTypes.ENUM(...NOTIFICATION_TYPES),
                    allowNull: false,
                    defaultValue: "SYSTEM",
                },
                title: { type: DataTypes.STRING(160), allowNull: false },
                body: { type: DataTypes.STRING(500), allowNull: true },
                data: { type: DataTypes.JSONB, allowNull: true },
                readAt: { type: DataTypes.DATE, allowNull: true },
                convertedAt: { type: DataTypes.DATE, allowNull: true },
            } as unknown as ModelAttributes<Notification, INotification>, // Sequelize manages timestamps
            {
                sequelize,
                tableName: "notifications",
                timestamps: true,
                updatedAt: false,
                underscored: true,
            },
        );
    }
}

export default Notification;
