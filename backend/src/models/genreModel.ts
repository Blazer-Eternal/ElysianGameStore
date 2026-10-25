import { DataTypes, Model, ModelAttributes, Sequelize } from "sequelize";

import { IGenre, IGenreCreation } from "../interfaces/genreInterface";

// Admin-controlled list; M:N with games through game_genres.
class Genre extends Model<IGenre, IGenreCreation> implements IGenre {
    declare id: string;
    declare name: string;
    declare slug: string;
    declare readonly createdAt: Date;
    declare readonly updatedAt: Date;

    static initModel(sequelize: Sequelize): void {
        Genre.init(
            {
                id: {
                    type: DataTypes.UUID,
                    defaultValue: DataTypes.UUIDV4,
                    primaryKey: true,
                },
                name: { type: DataTypes.STRING(60), allowNull: false },
                slug: { type: DataTypes.STRING(80), allowNull: false },
            } as unknown as ModelAttributes<Genre, IGenre>, // Sequelize manages timestamps
            {
                sequelize,
                tableName: "genres",
                timestamps: true,
                underscored: true,
            },
        );
    }
}

export default Genre;
