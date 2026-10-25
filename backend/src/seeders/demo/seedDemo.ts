import { faker } from "@faker-js/faker";

import { Database } from "../../config";
// Importing from the models index runs initModel + defineAssociations once.
import {
    AuditLog,
    Cart,
    CartItem,
    Coupon,
    Game,
    GameBuild,
    GameKey,
    GameMedia,
    Genre,
    Gift,
    LibraryEntry,
    Notification,
    Order,
    OrderItem,
    Payment,
    Payout,
    PlaySession,
    Promotion,
    Publisher,
    Refund,
    Review,
    SystemRequirement,
    Tag,
    TaxConfig,
    User,
} from "../../models";
import { runBaseSeeder } from "../baseSeeder";
import { FAKER_SEED } from "../seedUtils";
import { runGameSeeder } from "./gameSeeder";
import { runNotificationSeeder } from "./notificationSeeder";
import { runOrderSeeder } from "./orderSeeder";
import { runPromotionSeeder } from "./promotionSeeder";
import { runReviewSeeder } from "./reviewSeeder";
import { runUserSeeder } from "./userSeeder";

// ---------------------------------------------------------------------------
// Demo dataset orchestrator. Runs every step in FK dependency order; every
// step is idempotent (find-or-create by unique key or deterministic UUID), so
// the whole thing is safe to re-run after partial failures or schema changes.
//
// Determinism: one global faker seed (12345) set before anything generates
// text, and every generated primary key is derived from a stable name via
// seedUuid — two runs of this script on an empty database produce identical
// rows, ids included.
// ---------------------------------------------------------------------------

faker.seed(FAKER_SEED);

type Step = [string, () => Promise<{ created: Record<string, number> }>];

const steps: Step[] = [
    ["reference data", runBaseSeeder],
    ["users", runUserSeeder],
    ["games", runGameSeeder],
    ["promotions", runPromotionSeeder],
    ["orders", runOrderSeeder],
    ["reviews", runReviewSeeder],
    ["notifications", runNotificationSeeder],
];

export const runDemoSeeders = async (): Promise<void> => {
    await Database.sequelize.authenticate();

    for (const [label, step] of steps) {
        const { created } = await step();
        const detail =
            Object.keys(created).length === 0
                ? "ok"
                : Object.entries(created)
                      .map(([key, value]) => `${key} +${value}`)
                      .join(", ");
        console.log(`  ${label.padEnd(16)} ${detail}`);
    }

    // Final dataset totals, for eyeballing the numbers.
    const [
        users,
        publishers,
        genres,
        tags,
        taxConfigs,
        games,
        builds,
        specs,
        media,
        keys,
        promotions,
        coupons,
        carts,
        cartItems,
        orders,
        orderItems,
        payments,
        refunds,
        library,
        sessions,
        reviews,
        wishlists,
        payouts,
        notifications,
        gifts,
        auditLogs,
    ] = await Promise.all([
        User.count(),
        Publisher.count(),
        Genre.count(),
        Tag.count(),
        TaxConfig.count(),
        Game.count(),
        GameBuild.count(),
        SystemRequirement.count(),
        GameMedia.count(),
        GameKey.count(),
        Promotion.count(),
        Coupon.count(),
        Cart.count(),
        CartItem.count(),
        Order.count(),
        OrderItem.count(),
        Payment.count(),
        Refund.count(),
        LibraryEntry.count(),
        PlaySession.count(),
        Review.count(),
        // Wishlist has no surrogate id — count via the raw table.
        Database.sequelize.query("SELECT COUNT(*)::int AS c FROM wishlists", {
            type: "SELECT" as never,
        }).then((rows) => (rows as unknown as Array<{ c: number }>)[0].c),
        Payout.count(),
        Notification.count(),
        Gift.count(),
        AuditLog.count(),
    ]);

    console.log("\nDataset totals:");
    console.log(`  users ${users} | publishers ${publishers} | tax configs ${taxConfigs}`);
    console.log(`  genres ${genres} | tags ${tags} | games ${games}`);
    console.log(`  builds ${builds} | specs ${specs} | media ${media} | keys ${keys}`);
    console.log(`  promotions ${promotions} | coupons ${coupons}`);
    console.log(`  carts ${carts} | cart items ${cartItems} | wishlists ${wishlists}`);
    console.log(`  orders ${orders} | items ${orderItems} | payments ${payments} | refunds ${refunds}`);
    console.log(`  library ${library} | sessions ${sessions} | reviews ${reviews}`);
    console.log(`  payouts ${payouts} | notifications ${notifications}`);
    console.log(`  gifts ${gifts} | audit logs ${auditLogs}`);
    console.log(`\n  demo login: aarav@example.com / nisha@example.com / kiran@example.com`);
    console.log(`  publisher:  himalaya.studio@example.com / yeti.works@example.com`);
    console.log(`  admin:      demo.admin@example.com (password: see DEMO_PASSWORD in demo/userSeeder.ts)`);
};

if (require.main === module) {
    runDemoSeeders()
        .then(() => console.log("\nDemo seed complete."))
        .catch((error) => {
            console.error("\nDemo seeding failed:", error);
            process.exitCode = 1;
        })
        .finally(() => Database.sequelize.close());
}
