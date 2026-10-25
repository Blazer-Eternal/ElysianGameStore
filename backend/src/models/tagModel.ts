import { DataTypes, Model, ModelAttributes, Sequelize } from "sequelize";

import { ITag, ITagCreation } from "../interfaces/tagInterface";

// Community/publisher tags; M:N with games through game_tags.
class Tag extends Model<ITag, ITagCreation> implements ITag {
    declare id: string;
    declare name: string;
    declare slug: string;
    declare readonly createdAt: Date;
    declare readonly updatedAt: Date;

    static initModel(sequelize: Sequelize): void {
        Tag.init(
            {
                id: {
                    type: DataTypes.UUID,
                    defaultValue: DataTypes.UUIDV4,
                    primaryKey: true,
                },
                name: { type: DataTypes.STRING(60), allowNull: false },
                slug: { type: DataTypes.STRING(80), allowNull: false },
            } as unknown as ModelAttributes<Tag, ITag>, // Sequelize manages timestamps
            {
                sequelize,
                tableName: "tags",
                timestamps: true,
                underscored: true,
            },
        );
    }
}

export default Tag;
