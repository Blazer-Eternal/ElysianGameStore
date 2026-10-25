import { QueryTypes } from "sequelize";

import { Database } from "../config";

const { sequelize } = Database;

// Aggregated analytics for the admin and publisher dashboards. All figures are
// integer paisa computed in Postgres, never in JS floats.
class DashboardRepository {
    static async adminOverview(): Promise<Record<string, number>> {
        const rows = await sequelize.query<Record<string, number>>(
            `SELECT
                (SELECT COUNT(*) FROM users)::int AS users,
                (SELECT COUNT(*) FROM users WHERE role = 'PUBLISHER')::int AS publishers,
                (SELECT COUNT(*) FROM publishers WHERE status = 'VERIFIED')::int AS verified_publishers,
                (SELECT COUNT(*) FROM games)::int AS games,
                (SELECT COUNT(*) FROM games WHERE status = 'PUBLISHED')::int AS published_games,
                (SELECT COUNT(*) FROM orders WHERE status = 'PENDING')::int AS pending_orders,
                (SELECT COUNT(*) FROM refunds WHERE status = 'PENDING')::int AS pending_refunds,
                (SELECT COALESCE(SUM(total_paisa), 0) FROM orders
                  WHERE status IN ('PAID', 'PARTIAL_REFUND', 'REFUNDED')
                    AND paid_at > NOW() - INTERVAL '30 days')::int AS revenue_30d_paisa,
                (SELECT COUNT(*) FROM orders
                  WHERE status IN ('PAID', 'PARTIAL_REFUND', 'REFUNDED')
                    AND paid_at > NOW() - INTERVAL '30 days')::int AS paid_orders_30d`,
            { type: QueryTypes.SELECT },
        );
        return rows[0] ?? {};
    }

    static async ordersByStatus(): Promise<Array<{ status: string; count: number }>> {
        return sequelize.query<{ status: string; count: number }>(
            `SELECT status, COUNT(*)::int AS count FROM orders GROUP BY status ORDER BY count DESC`,
            { type: QueryTypes.SELECT },
        );
    }

    static async topGames(limit: number = 10): Promise<
        Array<{ gameId: string; units: number; netPaisa: number }>
    > {
        return sequelize.query<{ gameId: string; units: number; netPaisa: number }>(
            `SELECT oi.game_id AS "gameId",
                    COUNT(*)::int AS units,
                    COALESCE(SUM(oi.unit_price_paisa - oi.discount_paisa), 0)::int AS "netPaisa"
             FROM order_items oi
             JOIN orders o ON o.id = oi.order_id
             WHERE o.status IN ('PAID', 'PARTIAL_REFUND')
               AND o.paid_at > NOW() - INTERVAL '30 days'
             GROUP BY oi.game_id ORDER BY units DESC LIMIT :limit`,
            { replacements: { limit }, type: QueryTypes.SELECT },
        );
    }

    static async publisherOverview(publisherId: string): Promise<Record<string, number>> {
        const rows = await sequelize.query<Record<string, number>>(
            `SELECT
                (SELECT COALESCE(SUM(oi.unit_price_paisa - oi.discount_paisa), 0)
                 FROM order_items oi JOIN orders o ON o.id = oi.order_id
                 WHERE oi.publisher_id = :publisherId
                   AND o.status IN ('PAID', 'PARTIAL_REFUND', 'REFUNDED')
                   AND o.paid_at > NOW() - INTERVAL '30 days')::int AS gross_30d_paisa,
                (SELECT COUNT(*) FROM order_items oi JOIN orders o ON o.id = oi.order_id
                 WHERE oi.publisher_id = :publisherId
                   AND o.status IN ('PAID', 'PARTIAL_REFUND', 'REFUNDED')
                   AND o.paid_at > NOW() - INTERVAL '30 days')::int AS units_30d,
                (SELECT COALESCE(SUM(r.amount_paisa), 0) FROM refunds r
                 JOIN order_items oi ON oi.id = r.order_item_id
                 WHERE oi.publisher_id = :publisherId AND r.status = 'APPROVED'
                   AND r.decided_at > NOW() - INTERVAL '30 days')::int AS refunds_30d_paisa,
                (SELECT COALESCE(SUM(net_paisa), 0) FROM payouts
                 WHERE publisher_id = :publisherId AND status = 'PENDING')::int AS pending_payout_paisa`,
            { replacements: { publisherId }, type: QueryTypes.SELECT },
        );
        return rows[0] ?? {};
    }

    // Wishlist-driven sale conversion: of the promotion notifications fanned
    // out, how many led to a purchase.
    static async wishlistConversion(): Promise<{ sent: number; converted: number; pct: number }> {
        const rows = await sequelize.query<{ sent: number; converted: number; pct: number }>(
            `SELECT COUNT(*)::int AS sent,
                    COUNT(converted_at)::int AS converted,
                    CASE WHEN COUNT(*) = 0 THEN 0
                         ELSE ROUND(COUNT(converted_at) * 100.0 / COUNT(*), 1)
                    END AS pct
             FROM notifications WHERE type = 'PROMOTION'`,
            { type: QueryTypes.SELECT },
        );
        return rows[0] ?? { sent: 0, converted: 0, pct: 0 };
    }
}

export default DashboardRepository;
