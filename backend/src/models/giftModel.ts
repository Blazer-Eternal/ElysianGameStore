import { DataTypes, Model, ModelAttributes, Sequelize } from "sequelize";

import { GIFT_STATUSES, GiftStatus } from "../enums/giftStatusEnum";
import { IGift, IGiftCreation } from "../interfaces/giftInterface";

// Created at PAID time instead of a library entry (gift checkout is
// single-item). redeemToken is a single-use random token; the recipient's
// email must match to redeem.
class Gift extends Model<IGift, IGiftCreation> implements IGift {
    declare id: string;
    declare senderId: string;
    declare recipientEmail: string;
    declare gameId: string;
    declare orderItemId: string | null;
    declare status: GiftStatus;
    declare redeemToken: string;
    declare expiresAt: Date;
    declare redeemedBy: string | null;
    declare redeemedAt: Date | null;
    declare readonly createdAt: Date;
    declare readonly updatedAt: Date;

    static initModel(sequelize: Sequelize): void {
        Gift.init(
            {
                id: {
                    type: DataTypes.UUID,
                    defaultValue: DataTypes.UUIDV4,
                    primaryKey: true,
                },
                senderId: { type: DataTypes.UUID, allowNull: false },
                recipientEmail: { type: DataTypes.STRING(320), allowNull: false },
                gameId: { type: DataTypes.UUID, allowNull: false },
                orderItemId: { type: DataTypes.UUID, allowNull: true, unique: true },
                status: {
                    type: DataTypes.ENUM(...GIFT_STATUSES),
                    allowNull: false,
                    defaultValue: GiftStatus.PENDING,
                },
                redeemToken: { type: DataTypes.STRING(64), allowNull: false, unique: true },
                expiresAt: { type: DataTypes.DATE, allowNull: false },
                redeemedBy: { type: DataTypes.UUID, allowNull: true },
                redeemedAt: { type: DataTypes.DATE, allowNull: true },
            } as unknown as ModelAttributes<Gift, IGift>, // Sequelize manages timestamps
            {
                sequelize,
                tableName: "gifts",
                timestamps: true,
                underscored: true,
            },
        );
    }
}

export default Gift;
