import { DataTypes, Model, ModelAttributes, Sequelize } from "sequelize";

import { FUNDED_BY } from "../enums/fundedByEnum";
import { PROMOTION_TYPES } from "../enums/promotionTypeEnum";
import { IPromotion, IPromotionCreation } from "../interfaces/promotionInterface";

// notifiedAt marks the wishlist fan-out as done, making the promotion-start
// notification sweep idempotent.
class Promotion extends Model<IPromotion, IPromotionCreation> implements IPromotion {
    declare id: string;
    declare name: string;
    declare type: IPromotion["type"];
    declare value: number;
    declare startsAt: Date;
    declare endsAt: Date;
    declare fundedBy: IPromotion["fundedBy"];
    declare createdBy: string;
    declare notifiedAt: Date | null;
    declare readonly createdAt: Date;
    declare readonly updatedAt: Date;

    static initModel(sequelize: Sequelize): void {
        Promotion.init(
            {
                id: {
                    type: DataTypes.UUID,
                    defaultValue: DataTypes.UUIDV4,
                    primaryKey: true,
                },
                name: { type: DataTypes.STRING(120), allowNull: false },
                type: { type: DataTypes.ENUM(...PROMOTION_TYPES), allowNull: false },
                value: { type: DataTypes.INTEGER, allowNull: false },
                startsAt: { type: DataTypes.DATE, allowNull: false },
                endsAt: { type: DataTypes.DATE, allowNull: false },
                fundedBy: {
                    type: DataTypes.ENUM(...FUNDED_BY),
                    allowNull: false,
                    defaultValue: "STORE",
                },
                createdBy: { type: DataTypes.UUID, allowNull: false },
                notifiedAt: { type: DataTypes.DATE, allowNull: true },
            } as unknown as ModelAttributes<Promotion, IPromotion>, // Sequelize manages timestamps
            {
                sequelize,
                tableName: "promotions",
                timestamps: true,
                underscored: true,
                validate: {
                    endsAfterStarts() {
                        if (this.startsAt && this.endsAt && this.endsAt <= this.startsAt) {
                            throw new Error("endsAt must be after startsAt");
                        }
                    },
                },
            },
        );
    }
}

export default Promotion;
