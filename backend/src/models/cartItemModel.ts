import { DataTypes, Model, ModelAttributes, Sequelize } from "sequelize";

import { ICartItem, ICartItemCreation } from "../interfaces/cartItemInterface";
import type Game from "./gameModel";

// Unique (cart_id, game_id); no quantity — a PC game is bought once.
class CartItem extends Model<ICartItem, ICartItemCreation> implements ICartItem {
    declare id: string;
    declare cartId: string;
    declare gameId: string;
    declare addedAt: Date;
    declare readonly createdAt: Date;
    // Populated by list queries via include: [{ model: Game, as: "game" }].
    declare game?: Game;

    static initModel(sequelize: Sequelize): void {
        CartItem.init(
            {
                id: {
                    type: DataTypes.UUID,
                    defaultValue: DataTypes.UUIDV4,
                    primaryKey: true,
                },
                cartId: { type: DataTypes.UUID, allowNull: false },
                gameId: { type: DataTypes.UUID, allowNull: false },
                addedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
            } as unknown as ModelAttributes<CartItem, ICartItem>, // Sequelize manages timestamps
            {
                sequelize,
                tableName: "cart_items",
                timestamps: true,
                updatedAt: false,
                underscored: true,
            },
        );
    }
}

export default CartItem;
