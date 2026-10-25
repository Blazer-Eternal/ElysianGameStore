import { DataTypes, Model, ModelAttributes, Sequelize } from "sequelize";

import { DISCOUNT_TYPES } from "../enums/discountTypeEnum";
import { ICoupon, ICouponCreation } from "../interfaces/couponInterface";

// code is unique. used_count <= max_uses is enforced atomically at checkout
// with a conditional UPDATE (reserve) and released if the order fails.
class Coupon extends Model<ICoupon, ICouponCreation> implements ICoupon {
    declare id: string;
    declare code: string;
    declare discountType: ICoupon["discountType"];
    declare value: number;
    declare maxUses: number;
    declare usedCount: number;
    declare perUserLimit: number | null;
    declare minOrderPaisa: number;
    declare expiresAt: Date | null;
    declare isActive: boolean;
    declare readonly createdAt: Date;
    declare readonly updatedAt: Date;

    static initModel(sequelize: Sequelize): void {
        Coupon.init(
            {
                id: {
                    type: DataTypes.UUID,
                    defaultValue: DataTypes.UUIDV4,
                    primaryKey: true,
                },
                code: { type: DataTypes.STRING(40), allowNull: false },
                discountType: {
                    type: DataTypes.ENUM(...DISCOUNT_TYPES),
                    allowNull: false,
                },
                value: { type: DataTypes.INTEGER, allowNull: false },
                maxUses: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
                usedCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
                perUserLimit: { type: DataTypes.INTEGER, allowNull: true },
                minOrderPaisa: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
                expiresAt: { type: DataTypes.DATE, allowNull: true },
                isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
            } as unknown as ModelAttributes<Coupon, ICoupon>, // Sequelize manages timestamps
            {
                sequelize,
                tableName: "coupons",
                timestamps: true,
                underscored: true,
            },
        );
    }
}

export default Coupon;
