import { DataTypes, Model, ModelAttributes, Sequelize } from "sequelize";

import { GAME_KEY_STATUSES, GameKeyStatus } from "../enums/gameKeyStatusEnum";
import { IGameKey, IGameKeyCreation } from "../interfaces/gameKeyInterface";

// Only the SHA-256 hash of a key is stored. Redeem runs SELECT ... FOR UPDATE
// and transitions AVAILABLE → REDEEMED atomically, so two buyers can never
// redeem the same key.
class GameKey extends Model<IGameKey, IGameKeyCreation> implements IGameKey {
    declare id: string;
    declare gameId: string;
    declare keyHash: string;
    declare status: GameKeyStatus;
    declare reservedUntil: Date | null;
    declare reservedBy: string | null;
    declare redeemedBy: string | null;
    declare readonly createdAt: Date;
    declare readonly updatedAt: Date;

    static initModel(sequelize: Sequelize): void {
        GameKey.init(
            {
                id: {
                    type: DataTypes.UUID,
                    defaultValue: DataTypes.UUIDV4,
                    primaryKey: true,
                },
                gameId: { type: DataTypes.UUID, allowNull: false },
                keyHash: { type: DataTypes.STRING(64), allowNull: false, unique: true },
                status: {
                    type: DataTypes.ENUM(...GAME_KEY_STATUSES),
                    allowNull: false,
                    defaultValue: GameKeyStatus.AVAILABLE,
                },
                reservedUntil: { type: DataTypes.DATE, allowNull: true },
                reservedBy: { type: DataTypes.UUID, allowNull: true },
                redeemedBy: { type: DataTypes.UUID, allowNull: true },
            } as unknown as ModelAttributes<GameKey, IGameKey>, // Sequelize manages timestamps
            {
                sequelize,
                tableName: "game_keys",
                timestamps: true,
                underscored: true,
            },
        );
    }
}

export default GameKey;
