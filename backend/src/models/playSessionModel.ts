import { DataTypes, Model, ModelAttributes, Sequelize } from "sequelize";

import { IPlaySession, IPlaySessionCreation } from "../interfaces/playSessionInterface";

// Feeds refund eligibility ("hours played") and review playtime snapshots.
// Open sessions older than a day are closed by the maintenance sweeper.
class PlaySession extends Model<IPlaySession, IPlaySessionCreation> implements IPlaySession {
    declare id: string;
    declare userId: string;
    declare gameId: string;
    declare startedAt: Date;
    declare endedAt: Date | null;
    declare readonly createdAt: Date;

    static initModel(sequelize: Sequelize): void {
        PlaySession.init(
            {
                id: {
                    type: DataTypes.UUID,
                    defaultValue: DataTypes.UUIDV4,
                    primaryKey: true,
                },
                userId: { type: DataTypes.UUID, allowNull: false },
                gameId: { type: DataTypes.UUID, allowNull: false },
                startedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
                endedAt: { type: DataTypes.DATE, allowNull: true },
            } as unknown as ModelAttributes<PlaySession, IPlaySession>, // Sequelize manages timestamps
            {
                sequelize,
                tableName: "play_sessions",
                timestamps: true,
                updatedAt: false,
                underscored: true,
            },
        );
    }
}

export default PlaySession;
