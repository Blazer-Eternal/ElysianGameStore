import AuditLog from "../models/auditLogModel";
import { IAuditLogCreation } from "../interfaces/auditLogInterface";

// Append-only: create + list, nothing else. There is deliberately no update
// or delete method.
class AuditLogRepository {
    static async create(data: IAuditLogCreation): Promise<AuditLog> {
        return AuditLog.create(data);
    }

    static async list(params: {
        actorId?: string;
        entity?: string;
        entityId?: string;
        limit: number;
        offset: number;
    }): Promise<{ rows: AuditLog[]; count: number }> {
        const where: Record<string, unknown> = {};
        if (params.actorId) where.actorId = params.actorId;
        if (params.entity) where.entity = params.entity;
        if (params.entityId) where.entityId = params.entityId;
        return AuditLog.findAndCountAll({
            where,
            limit: params.limit,
            offset: params.offset,
            order: [["created_at", "DESC"]],
        });
    }
}

export default AuditLogRepository;
