import { DataTypes, Model, ModelAttributes, Sequelize } from "sequelize";

import { MEDIA_TYPES } from "../enums/mediaTypeEnum";
import { IGameMedia, IGameMediaCreation } from "../interfaces/gameMediaInterface";

// Exactly one COVER per game — partial unique index in the migration.
class GameMedia extends Model<IGameMedia, IGameMediaCreation> implements IGameMedia {
    declare id: string;
    declare gameId: string;
    declare type: IGameMedia["type"];
    declare url: string;
    declare sortOrder: number;
    declare readonly createdAt: Date;
    declare readonly updatedAt: Date;

    static initModel(sequelize: Sequelize): void {
        GameMedia.init(
            {
                id: {
                    type: DataTypes.UUID,
                    defaultValue: DataTypes.UUIDV4,
                    primaryKey: true,
                },
                gameId: { type: DataTypes.UUID, allowNull: false },
                type: { type: DataTypes.ENUM(...MEDIA_TYPES), allowNull: false },
                url: { type: DataTypes.STRING(500), allowNull: false },
                sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
            } as unknown as ModelAttributes<GameMedia, IGameMedia>, // Sequelize manages timestamps
            {
                sequelize,
                tableName: "game_media",
                timestamps: true,
                underscored: true,
            },
        );
    }
}

export default GameMedia;
