import { DataTypes, Model, ModelAttributes, Sequelize } from "sequelize";

import { PLATFORMS } from "../enums/platformEnum";
import { IGameBuild, IGameBuildCreation } from "../interfaces/gameBuildInterface";

// Unique (game_id, version, platform); a partial unique index guarantees one
// active build per platform. checksum_sha256 is returned with the signed
// download URL so the client can verify integrity.
class GameBuild extends Model<IGameBuild, IGameBuildCreation> implements IGameBuild {
    declare id: string;
    declare gameId: string;
    declare version: string;
    declare platform: IGameBuild["platform"];
    declare fileSizeBytes: number;
    declare checksumSha256: string;
    declare cdnUrl: string;
    declare changelog: string | null;
    declare isActive: boolean;
    declare readonly createdAt: Date;
    declare readonly updatedAt: Date;

    static initModel(sequelize: Sequelize): void {
        GameBuild.init(
            {
                id: {
                    type: DataTypes.UUID,
                    defaultValue: DataTypes.UUIDV4,
                    primaryKey: true,
                },
                gameId: { type: DataTypes.UUID, allowNull: false },
                version: { type: DataTypes.STRING(32), allowNull: false },
                platform: {
                    type: DataTypes.ENUM(...PLATFORMS),
                    allowNull: false,
                },
                fileSizeBytes: {
                    type: DataTypes.BIGINT,
                    allowNull: false,
                    get(this: GameBuild) {
                        const raw = this.getDataValue("fileSizeBytes") as unknown as string | number;
                        return raw == null ? 0 : Number(raw);
                    },
                },
                checksumSha256: { type: DataTypes.STRING(64), allowNull: false },
                cdnUrl: { type: DataTypes.STRING(500), allowNull: false },
                changelog: { type: DataTypes.TEXT, allowNull: true },
                isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
            } as unknown as ModelAttributes<GameBuild, IGameBuild>, // Sequelize manages timestamps
            {
                sequelize,
                tableName: "game_builds",
                timestamps: true,
                underscored: true,
            },
        );
    }
}

export default GameBuild;
