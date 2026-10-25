import { DataTypes, Model, ModelAttributes, Sequelize } from "sequelize";

import { REFUND_STATUSES, RefundStatus } from "../enums/refundStatusEnum";
import { IRefund, IRefundCreation } from "../interfaces/refundInterface";

// One refund per order item (unique order_item_id). An APPROVED refund has
// already been executed: provider refund stubbed, license revoked, order
// status moved to REFUNDED / PARTIAL_REFUND.
class Refund extends Model<IRefund, IRefundCreation> implements IRefund {
    declare id: string;
    declare orderItemId: string;
    declare reason: string;
    declare amountPaisa: number;
    declare status: RefundStatus;
    declare requestedAt: Date;
    declare decidedBy: string | null;
    declare decidedAt: Date | null;
    declare readonly createdAt: Date;
    declare readonly updatedAt: Date;

    static initModel(sequelize: Sequelize): void {
        Refund.init(
            {
                id: {
                    type: DataTypes.UUID,
                    defaultValue: DataTypes.UUIDV4,
                    primaryKey: true,
                },
                orderItemId: { type: DataTypes.UUID, allowNull: false, unique: true },
                reason: { type: DataTypes.STRING(500), allowNull: false },
                amountPaisa: { type: DataTypes.INTEGER, allowNull: false },
                status: {
                    type: DataTypes.ENUM(...REFUND_STATUSES),
                    allowNull: false,
                    defaultValue: RefundStatus.PENDING,
                },
                requestedAt: { type: DataTypes.DATE, allowNull: false },
                decidedBy: { type: DataTypes.UUID, allowNull: true },
                decidedAt: { type: DataTypes.DATE, allowNull: true },
            } as unknown as ModelAttributes<Refund, IRefund>, // Sequelize manages timestamps
            {
                sequelize,
                tableName: "refunds",
                timestamps: true,
                underscored: true,
            },
        );
    }
}

export default Refund;
