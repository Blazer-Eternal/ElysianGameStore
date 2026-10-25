import { DataTypes, Model, ModelAttributes, Sequelize } from "sequelize";

import { SYSTEM_REQUIREMENT_TYPES } from "../enums/systemRequirementTypeEnum";
import {
    ISystemRequirement,
    ISystemRequirementCreation,
} from "../interfaces/systemRequirementInterface";

// Unique (game_id, type). REC must be >= MIN on RAM and storage — enforced
// in gameServices when both rows exist.
class SystemRequirement
    extends Model<ISystemRequirement, ISystemRequirementCreation>
    implements ISystemRequirement
{
    declare id: string;
    declare gameId: string;
    declare type: ISystemRequirement["type"];
    declare os: string;
    declare cpu: string;
    declare gpu: string;
    declare ramGb: number;
    declare storageGb: number;
    declare directx: string | null;
    declare readonly createdAt: Date;
    declare readonly updatedAt: Date;

    static initModel(sequelize: Sequelize): void {
        SystemRequirement.init(
            {
                id: {
                    type: DataTypes.UUID,
                    defaultValue: DataTypes.UUIDV4,
                    primaryKey: true,
                },
                gameId: { type: DataTypes.UUID, allowNull: false },
                type: {
                    type: DataTypes.ENUM(...SYSTEM_REQUIREMENT_TYPES),
                    allowNull: false,
                },
                os: { type: DataTypes.STRING(80), allowNull: false },
                cpu: { type: DataTypes.STRING(160), allowNull: false },
                gpu: { type: DataTypes.STRING(160), allowNull: false },
                ramGb: { type: DataTypes.INTEGER, allowNull: false },
                storageGb: { type: DataTypes.INTEGER, allowNull: false },
                directx: { type: DataTypes.STRING(20), allowNull: true },
            } as unknown as ModelAttributes<SystemRequirement, ISystemRequirement>, // Sequelize manages timestamps
            {
                sequelize,
                tableName: "system_requirements",
                timestamps: true,
                underscored: true,
            },
        );
    }
}

export default SystemRequirement;
