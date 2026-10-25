import { Response } from "express";

import { Database, environment } from "../../config";
import { AppRequest as Request } from "../../interfaces";
import { asyncHandler } from "../../middleware/exceptionHandler";
import { AuditLogRepository } from "../../repositories";
import { maintenanceServices, pricingServices } from "../../services";
import { sendSuccess } from "../../utils/response";

const { sequelize } = Database;

// ---------------------------------------------------------------------------
// Health / status. No dashboard service covers this, so it lives here: a
// shallow liveness check plus a real DB ping. Never throws — degraded DB is
// reported as such with a 200 so uptime probes can read the body.
// ---------------------------------------------------------------------------
export const health = asyncHandler(async (_req: Request, res: Response) => {
    const startedAt = Date.now();
    let database: "up" | "down" = "up";
    try {
        await sequelize.authenticate();
    } catch {
        database = "down";
    }
    sendSuccess(res, {
        status: database === "up" ? "ok" : "degraded",
        database,
        environment: environment ?? "development",
        uptimeSeconds: Math.round(process.uptime()),
        checkedAt: new Date().toISOString(),
        latencyMs: Date.now() - startedAt,
    }, "OK");
});

// ---------------------------------------------------------------------------
// Maintenance (admin): run the idempotent in-process sweeps on demand —
// promotion fan-out, expired orders/gifts, stale key reservations, stale
// sessions. All counters are plain integers.
// ---------------------------------------------------------------------------
export const runSweeps = asyncHandler(async (_req: Request, res: Response) => {
    const summary = await maintenanceServices.runSweeps();
    sendSuccess(res, summary, "Maintenance sweeps complete");
});

// ---------------------------------------------------------------------------
// Audit trail (admin, read-only). The repository is append-only by design;
// this endpoint only ever lists. Filters mirror auditLogQuerySchema.
// ---------------------------------------------------------------------------
export const listAuditLogs = asyncHandler(async (req: Request, res: Response) => {
    const q = req.query as Record<string, string | undefined>;
    const page = Number(q.page ?? 1);
    const pageSize = Number(q.pageSize ?? 12);
    const { rows, count } = await AuditLogRepository.list({
        actorId: q.actorId,
        entity: q.entity,
        entityId: q.entityId,
        limit: pageSize,
        offset: (page - 1) * pageSize,
    });
    sendSuccess(res, { logs: rows, total: count, page, pageSize });
});

// ---------------------------------------------------------------------------
// Tax config (admin): VAT lives in effective-dated rows — the row with the
// latest effective_from (<= now) wins inside pricingServices. "Setting" the
// rate therefore appends a new row (POST/PUT share the handler); history is
// never rewritten, and the next quote picks the new rate up automatically.
// ---------------------------------------------------------------------------
export const getTaxConfig = asyncHandler(async (_req: Request, res: Response) => {
    const [current, configs] = await Promise.all([
        pricingServices.getEffectiveTaxConfig(),
        pricingServices.listTaxConfigs(),
    ]);
    sendSuccess(res, { current, configs });
});

export const setTaxConfig = asyncHandler(async (req: Request, res: Response) => {
    const taxConfig = await pricingServices.createTaxConfig(req.user!.sub, req.body, req.ip);
    sendSuccess(res, { taxConfig }, "Tax config saved", 201);
});
