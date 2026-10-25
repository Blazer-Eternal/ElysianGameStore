import { DataTypes, Model, ModelAttributes, Sequelize } from "sequelize";

import { IPromotionGame, IPromotionGameCreation } from "../interfaces/promotionGameInterface";

// Unique (promotion_id, game_id). Overlapping promotions on the same game are
// blocked in promotionServices (windows may not intersect).
class PromotionGame
    extends Model<IPromotionGame, IPromotionGameCreation>
    implements IPromotionGame
{
    declare id: string;
    declare promotionId: string;
    declare gameId: string;
    declare discountPct: number;
    declare readonly createdAt: Date;

    static initModel(sequelize: Sequelize): void {
        PromotionGame.init(
            {
                id: {
                    type: DataTypes.UUID,
                    defaultValue: DataTypes.UUIDV4,
                    primaryKey: true,
                },
                promotionId: { type: DataTypes.UUID, allowNull: false },
                gameId: { type: DataTypes.UUID, allowNull: false },
                discountPct: { type: DataTypes.INTEGER, allowNull: false },
            } as unknown as ModelAttributes<PromotionGame, IPromotionGame>, // Sequelize manages timestamps
            {
                sequelize,
                tableName: "promotion_games",
                timestamps: true,
                updatedAt: false,
                underscored: true,
            },
        );
    }
}

export default PromotionGame;
