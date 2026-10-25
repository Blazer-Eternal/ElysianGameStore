import { sweepStartingPromotions } from "./promotionServices";
import { expirePendingOrders } from "./checkoutServices";
import { expirePending as expireGifts } from "./giftServices";
import { releaseExpiredReservations } from "./gameKeyServices";
import { PlaySessionRepository, SessionRepository } from "../repositories";

// ---------------------------------------------------------------------------
// In-process maintenance sweeps (no cron/Redis needed for the DB-only setup).
// server.ts starts these on an interval; every job is idempotent so overlapping
// runs are harmless.
// ---------------------------------------------------------------------------
export const runSweeps = async (): Promise<Record<string, number>> => {
    const [promotions, expiredOrders, gifts, keys, staleSessions, sessions] = await Promise.all([
        sweepStartingPromotions().catch((e) => {
            console.error("promotion sweep failed:", (e as Error).message);
            return 0;
        }),
        expirePendingOrders().catch((e) => {
            console.error("order sweep failed:", (e as Error).message);
            return 0;
        }),
        expireGifts().catch((e) => {
            console.error("gift sweep failed:", (e as Error).message);
            return 0;
        }),
        releaseExpiredReservations().catch((e) => {
            console.error("key sweep failed:", (e as Error).message);
            return 0;
        }),
        PlaySessionRepository.closeStale(new Date(Date.now() - 24 * 3600 * 1000)).catch(() => 0),
        SessionRepository.deleteExpired().catch(() => 0),
    ]);

    const summary = {
        promotionsNotified: promotions,
        ordersExpired: expiredOrders,
        giftsExpired: gifts,
        keysReleased: keys,
        sessionsClosed: staleSessions,
        sessionsDeleted: sessions,
    };
    const total = Object.values(summary).reduce((a, b) => a + b, 0);
    if (total > 0) console.info("maintenance sweep:", summary);
    return summary;
};

export const startScheduler = (): NodeJS.Timeout => {
    const intervalMs = Number(process.env.SWEEP_INTERVAL_MS) || 60000;
    // Kick once shortly after boot, then on the interval.
    const timer = setInterval(() => {
        void runSweeps();
    }, intervalMs);
    timer.unref?.();
    setTimeout(() => void runSweeps(), 5000).unref?.();
    return timer;
};
