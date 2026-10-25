import { DataTypes, Model, ModelAttributes, Sequelize } from "sequelize";

import { IOrderItem, IOrderItemCreation } from "../interfaces/orderItemInterface";

// Full price snapshot at checkout time. Payouts and refunds run on these
// immutable figures — later price changes never alter history.
class OrderItem extends Model<IOrderItem, IOrderItemCreation> implements IOrderItem {
    declare id: string;
    declare orderId: string;
    declare gameId: string;
    declare unitPricePaisa: number;
    declare promotionDiscountPaisa: number;
    declare couponDiscountPaisa: number;
    declare discountPaisa: number;
    declare taxPaisa: number;
    declare publisherId: string;
    declare revenueSharePct: number;
    declare readonly createdAt: Date;

    static initModel(sequelize: Sequelize): void {
        OrderItem.init(
            {
                id: {
                    type: DataTypes.UUID,
                    defaultValue: DataTypes.UUIDV4,
                    primaryKey: true,
                },
                orderId: { type: DataTypes.UUID, allowNull: false },
                gameId: { type: DataTypes.UUID, allowNull: false },
                unitPricePaisa: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
                promotionDiscountPaisa: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
                couponDiscountPaisa: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
                discountPaisa: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
                taxPaisa: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
                publisherId: { type: DataTypes.UUID, allowNull: false },
                revenueSharePct: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 70 },
            } as unknown as ModelAttributes<OrderItem, IOrderItem>, // Sequelize manages timestamps
            {
                sequelize,
                tableName: "order_items",
                timestamps: true,
                updatedAt: false,
                underscored: true,
            },
        );
    }
}

export default OrderItem;
