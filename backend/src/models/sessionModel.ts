import { DataTypes, Model, ModelAttributes, Sequelize } from "sequelize";

import { ISession, ISessionCreation } from "../interfaces/sessionInterface";

// Opaque refresh tokens. Only the SHA-256 hash is stored, so a database leak
// cannot be replayed as a login. Rotation marks the old row revoked.
class Session extends Model<ISession, ISessionCreation> implements ISession {
    declare id: string;
    declare userId: string;
    declare refreshTokenHash: string;
    declare userAgent: string | null;
    declare ip: string | null;
    declare expiresAt: Date;
    declare revokedAt: Date | null;
    declare readonly createdAt: Date;

    static initModel(sequelize: Sequelize): void {
        Session.init(
            {
                id: {
                    type: DataTypes.UUID,
                    defaultValue: DataTypes.UUIDV4,
                    primaryKey: true,
                },
                userId: { type: DataTypes.UUID, allowNull: false },
                refreshTokenHash: { type: DataTypes.STRING(64), allowNull: false },
                userAgent: { type: DataTypes.STRING(255), allowNull: true },
                ip: { type: DataTypes.STRING(64), allowNull: true },
                expiresAt: { type: DataTypes.DATE, allowNull: false },
                revokedAt: { type: DataTypes.DATE, allowNull: true },
            } as unknown as ModelAttributes<Session, ISession>, // Sequelize manages timestamps
            {
                sequelize,
                tableName: "sessions",
                timestamps: true,
                updatedAt: false,
                underscored: true,
            },
        );
    }
}

export default Session;
