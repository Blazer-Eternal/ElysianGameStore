import bcrypt from "bcryptjs";

import { Role } from "../../enums/roleEnum";
import { PayoutCurrency } from "../../enums/payoutCurrencyEnum";
import { PublisherStatus } from "../../enums/publisherStatusEnum";
import { UserStatus } from "../../enums/userStatusEnum";
// Importing from the models index runs initModel + defineAssociations once.
import { Publisher, User } from "../../models";

// ---------------------------------------------------------------------------
// Demo accounts. One shared password for local testing ONLY — never reuse it
// anywhere real. Hashed with the same rounds as authServices (10).
//
// The @elysian.com domain is reserved for the real admin seeded via
// adminSeeder; demo rows use the neutral example.com placeholder domain.
// ---------------------------------------------------------------------------
export const DEMO_PASSWORD = "Demo@12345!";
export const DEMO_EMAIL_DOMAIN = "example.com";

export const emailOf = (key: string): string => `${key}@${DEMO_EMAIL_DOMAIN}`;

interface DemoUser {
    key: string;
    username: string;
    role: Role;
    birthDate: Date;
}

// 1 admin, 2 publishers, 3 customers — every role reachable from the UI.
export const DEMO_USERS: DemoUser[] = [
    { key: "demo.admin", username: "demo.admin", role: Role.ADMIN, birthDate: new Date("1990-01-15") },
    { key: "himalaya.studio", username: "himalaya.studio", role: Role.PUBLISHER, birthDate: new Date("1988-06-20") },
    { key: "yeti.works", username: "yeti.works", role: Role.PUBLISHER, birthDate: new Date("1992-03-08") },
    { key: "aarav", username: "aarav", role: Role.CUSTOMER, birthDate: new Date("1997-11-02") },
    { key: "nisha", username: "nisha", role: Role.CUSTOMER, birthDate: new Date("2001-04-27") },
    { key: "kiran", username: "kiran", role: Role.CUSTOMER, birthDate: new Date("1995-09-12") },
];

// Publisher rows hang off the two PUBLISHER accounts (owner_user_id unique).
const DEMO_PUBLISHERS: Array<{
    userKey: string;
    name: string;
    legalName: string;
    taxId: string;
    payoutAccount: string;
    payoutCurrency: PayoutCurrency;
    revenueSharePct: number;
}> = [
    {
        userKey: "himalaya.studio",
        name: "Himalaya Studio",
        legalName: "Himalaya Studio Pvt. Ltd.",
        taxId: "PAN-601234567",
        payoutAccount: "9841000001",
        payoutCurrency: PayoutCurrency.NPR,
        revenueSharePct: 70,
    },
    {
        userKey: "yeti.works",
        name: "Yeti Works",
        legalName: "Yeti Works Interactive LLC",
        taxId: "EIN-88-1234567",
        payoutAccount: "USD-ACT-778812",
        payoutCurrency: PayoutCurrency.USD,
        revenueSharePct: 75,
    },
];

export const runUserSeeder = async (): Promise<{ created: Record<string, number> }> => {
    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
    let usersCreated = 0;
    let publishersCreated = 0;

    for (const demo of DEMO_USERS) {
        const email = emailOf(demo.key);
        const [, created] = await User.findOrCreate({
            where: { email },
            defaults: {
                email,
                username: demo.username,
                passwordHash,
                role: demo.role,
                countryCode: "NP",
                birthDate: demo.birthDate,
                status: UserStatus.ACTIVE,
                emailVerifiedAt: new Date("2026-01-01T00:00:00.000Z"),
            },
        });
        if (created) usersCreated += 1;
    }

    // Publisher rows are keyed by their unique owner_user_id.
    for (const demo of DEMO_PUBLISHERS) {
        const owner = await User.findOne({ where: { email: emailOf(demo.userKey) } });
        if (!owner) throw new Error(`Demo publisher owner missing: ${demo.userKey} — run users first`);

        const [, created] = await Publisher.findOrCreate({
            where: { ownerUserId: owner.id },
            defaults: {
                name: demo.name,
                legalName: demo.legalName,
                taxId: demo.taxId,
                payoutAccount: demo.payoutAccount,
                payoutCurrency: demo.payoutCurrency,
                revenueSharePct: demo.revenueSharePct,
                status: PublisherStatus.VERIFIED,
                ownerUserId: owner.id,
            },
        });
        if (created) publishersCreated += 1;
    }

    return { created: { users: usersCreated, publishers: publishersCreated } };
};

if (require.main === module) {
    runUserSeeder()
        .then(({ created }) => console.log(`Users: +${created.users}, publishers: +${created.publishers}`))
        .catch((error) => {
            console.error("User seeding failed:", error);
            process.exitCode = 1;
        });
}
