import { DataTypes, Model, ModelAttributes, Sequelize } from "sequelize";

import { ICart, ICartCreation } from "../interfaces/cartInterface";

// One cart per user (unique user_id); emptied as orders are paid, not replaced.
class Cart extends Model<ICart, ICartCreation> implements ICart {
    declare id: string;
    declare userId: string;
    declare readonly createdAt: Date;
    declare readonly updatedAt: Date;

    static initModel(sequelize: Sequelize): void {
        Cart.init(
            {
                id: {
                    type: DataTypes.UUID,
                    defaultValue: DataTypes.UUIDV4,
                    primaryKey: true,
                },
                userId: { type: DataTypes.UUID, allowNull: false, unique: true },
            } as unknown as ModelAttributes<Cart, ICart>, // Sequelize manages timestamps
            {
                sequelize,
                tableName: "carts",
                timestamps: true,
                underscored: true,
            },
        );
    }
}

export default Cart;
