import { DataTypes, Model, ModelAttributes, Sequelize } from "sequelize";

import { LIBRARY_SOURCES, LibrarySource } from "../enums/librarySourceEnum";
import { ILibraryEntry, ILibraryEntryCreation } from "../interfaces/libraryEntryInterface";
import type Game from "./gameModel";

// The ownership table (unique user_id + game_id). Revocation (refund /
// chargeback) stamps revoked_at instead of deleting, keeping the trail.
class LibraryEntry
    extends Model<ILibraryEntry, ILibraryEntryCreation>
    implements ILibraryEntry
{
    declare id: string;
    declare userId: string;
    declare gameId: string;
    declare orderItemId: string | null;
    declare acquiredAt: Date;
    declare source: LibrarySource;
    declare revokedAt: Date | null;
    declare readonly createdAt: Date;
    // Populated by list queries via include: [{ model: Game, as: "game" }].
    declare game?: Game;

    static initModel(sequelize: Sequelize): void {
        LibraryEntry.init(
            {
                id: {
                    type: DataTypes.UUID,
                    defaultValue: DataTypes.UUIDV4,
                    primaryKey: true,
                },
                userId: { type: DataTypes.UUID, allowNull: false },
                gameId: { type: DataTypes.UUID, allowNull: false },
                orderItemId: { type: DataTypes.UUID, allowNull: true },
                acquiredAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
                source: {
                    type: DataTypes.ENUM(...LIBRARY_SOURCES),
                    allowNull: false,
                    defaultValue: LibrarySource.PURCHASE,
                },
                revokedAt: { type: DataTypes.DATE, allowNull: true },
            } as unknown as ModelAttributes<LibraryEntry, ILibraryEntry>, // Sequelize manages timestamps
            {
                sequelize,
                tableName: "library_entries",
                timestamps: true,
                updatedAt: false,
                underscored: true,
            },
        );
    }
}

export default LibraryEntry;
