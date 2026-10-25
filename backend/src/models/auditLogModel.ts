import { DataTypes, Model, ModelAttributes, Sequelize } from "sequelize";

import { IAuditLog, IAuditLogCreation } from "../interfaces/auditLogInterface";

// Append-only. Covers price changes, refunds, role changes, publisher
// verifications and payout releases. Never updated, never deleted.
class AuditLog extends Model<IAuditLog, IAuditLogCreation> implements IAuditLog {
    declare id: string;
    declare actorId: string | null;
    declare action: string;
    declare entity: string;
    declare entityId: string;
    declare diff: unknown | null;
    declare ip: string | null;
    declare readonly createdAt: Date;

    static initModel(sequelize: Sequelize): void {
        AuditLog.init(
            {
                id: {
                    type: DataTypes.UUID,
                    defaultValue: DataTypes.UUIDV4,
                    primaryKey: true,
                },
                actorId: { type: DataTypes.UUID, allowNull: true },
                action: { type: DataTypes.STRING(80), allowNull: false },
                entity: { type: DataTypes.STRING(60), allowNull: false },
                entityId: { type: DataTypes.STRING(64), allowNull: false },
                diff: { type: DataTypes.JSONB, allowNull: true },
                ip: { type: DataTypes.STRING(64), allowNull: true },
            } as unknown as ModelAttributes<AuditLog, IAuditLog>, // Sequelize manages timestamps
            {
                sequelize,
                tableName: "audit_logs",
                timestamps: true,
                updatedAt: false,
                underscored: true,
            },
        );
    }
}

export default AuditLog;
