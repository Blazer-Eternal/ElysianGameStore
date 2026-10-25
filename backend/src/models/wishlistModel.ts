import { DataTypes, Model, ModelAttributes, Sequelize } from "sequelize";

import { IWishlist, IWishlistCreation } from "../interfaces/wishlistInterface";
import type Game from "./gameModel";

// Unique (user_id, game_id). Drives sale notifications: when a promotion
// starts, every user who wishlisted a covered game gets a PROMOTION
// notification whose later purchase is counted as a conversion.
class Wishlist extends Model<IWishlist, IWishlistCreation> implements IWishlist {
    declare userId: string;
    declare gameId: string;
    declare addedAt: Date;
    declare readonly createdAt: Date;
    // Populated by list queries via include: [{ model: Game, as: "game" }].
    declare game?: Game;

    static initModel(sequelize: Sequelize): void {
        Wishlist.init(
            {
                // Composite primary key matching the table (user_id, game_id).
                // Without an explicit PK Sequelize injects a phantom `id`
                // attribute, so every SELECT referenced a column that does not
                // exist ("column Wishlist.id does not exist" → 500).
                userId: { type: DataTypes.UUID, allowNull: false, primaryKey: true },
                gameId: { type: DataTypes.UUID, allowNull: false, primaryKey: true },
                addedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
            } as unknown as ModelAttributes<Wishlist, IWishlist>, // Sequelize manages timestamps
            {
                sequelize,
                tableName: "wishlists",
                timestamps: true,
                updatedAt: false,
                underscored: true,
                indexes: [
                    { unique: true, fields: ["user_id", "game_id"] },
                ],
            },
        );
    }
}

export default Wishlist;
