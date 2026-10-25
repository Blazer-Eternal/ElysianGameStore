import { DataTypes, Model, ModelAttributes, Sequelize } from "sequelize";

import { ORDER_STATUSES, OrderStatus } from "../enums/orderStatusEnum";
import { IOrder, IOrderCreation } from "../interfaces/orderInterface";

// totalPaisa = subtotalPaisa - discountPaisa + taxPaisa, all recomputed
// server-side at checkout. Immutable once PAID.
class Order extends Model<IOrder, IOrderCreation> implements IOrder {
    declare id: string;
    declare userId: string;
    declare status: OrderStatus;
    declare subtotalPaisa: number;
    declare discountPaisa: number;
    declare taxPaisa: number;
    declare totalPaisa: number;
    declare currency: string;
    declare couponId: string | null;
    declare giftRecipientEmail: string | null;
    declare paidAt: Date | null;
    declare readonly createdAt: Date;
    declare readonly updatedAt: Date;

    static initModel(sequelize: Sequelize): void {
        Order.init(
            {
                id: {
                    type: DataTypes.UUID,
                    defaultValue: DataTypes.UUIDV4,
                    primaryKey: true,
                },
                userId: { type: DataTypes.UUID, allowNull: false },
                status: {
                    type: DataTypes.ENUM(...ORDER_STATUSES),
                    allowNull: false,
                    defaultValue: OrderStatus.PENDING,
                },
                subtotalPaisa: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
                discountPaisa: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
                taxPaisa: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
                totalPaisa: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
                currency: { type: DataTypes.STRING(3), allowNull: false, defaultValue: "NPR" },
                couponId: { type: DataTypes.UUID, allowNull: true },
                giftRecipientEmail: { type: DataTypes.STRING(320), allowNull: true },
                paidAt: { type: DataTypes.DATE, allowNull: true },
            } as unknown as ModelAttributes<Order, IOrder>, // Sequelize manages timestamps
            {
                sequelize,
                tableName: "orders",
                timestamps: true,
                underscored: true,
            },
        );
    }
}

export default Order;
