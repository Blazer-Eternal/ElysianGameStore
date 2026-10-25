import { DataTypes, Model, ModelAttributes, Sequelize } from "sequelize";

import { AGE_RATINGS } from "../enums/ageRatingEnum";
import { GAME_STATUSES, GameStatus } from "../enums/gameStatusEnum";
import { IGame, IGameCreation } from "../interfaces/gameInterface";

// slug is unique. basePricePaisa >= 0 (0 = free-to-play); money is integer
// paisa everywhere. A game may only become PUBLISHED once it has an active
// build, one cover, 3+ screenshots and both MIN/REC requirement rows
// (assertPublishable in gameServices) and its publisher is VERIFIED.
class Game extends Model<IGame, IGameCreation> implements IGame {
    declare id: string;
    declare publisherId: string;
    declare title: string;
    declare slug: string;
    declare shortDesc: string;
    declare longDesc: string | null;
    declare releaseDate: Date | null;
    declare ageRating: IGame["ageRating"];
    declare basePricePaisa: number;
    declare currency: string;
    declare status: GameStatus;
    declare isEarlyAccess: boolean;
    declare publishedAt: Date | null;
    declare readonly createdAt: Date;
    declare readonly updatedAt: Date;

    static initModel(sequelize: Sequelize): void {
        Game.init(
            {
                id: {
                    type: DataTypes.UUID,
                    defaultValue: DataTypes.UUIDV4,
                    primaryKey: true,
                },
                publisherId: { type: DataTypes.UUID, allowNull: false },
                title: { type: DataTypes.STRING(160), allowNull: false },
                slug: { type: DataTypes.STRING(180), allowNull: false },
                shortDesc: { type: DataTypes.STRING(500), allowNull: false },
                longDesc: { type: DataTypes.TEXT, allowNull: true },
                releaseDate: { type: DataTypes.DATE, allowNull: true },
                ageRating: {
                    type: DataTypes.ENUM(...AGE_RATINGS),
                    allowNull: false,
                    defaultValue: "E",
                },
                basePricePaisa: {
                    type: DataTypes.INTEGER,
                    allowNull: false,
                    defaultValue: 0,
                },
                currency: { type: DataTypes.STRING(3), allowNull: false, defaultValue: "NPR" },
                status: {
                    type: DataTypes.ENUM(...GAME_STATUSES),
                    allowNull: false,
                    defaultValue: GameStatus.DRAFT,
                },
                isEarlyAccess: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
                publishedAt: { type: DataTypes.DATE, allowNull: true },
            } as unknown as ModelAttributes<Game, IGame>, // Sequelize manages timestamps
            {
                sequelize,
                tableName: "games",
                timestamps: true,
                underscored: true,
            },
        );
    }
}

export default Game;
