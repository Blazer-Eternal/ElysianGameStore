import bcrypt from "bcryptjs";

import { Database } from "../config";
import { Role } from "../enums/roleEnum";
import { UserStatus } from "../enums/userStatusEnum";
// Importing from the models index runs initModel + defineAssociations once.
import { User } from "../models";

// ---------------------------------------------------------------------------
// Bootstraps the initial ADMIN account. env.ts / .env.example do not define
// any ADMIN_* keys today, so the values below read process.env directly and
// fall back to safe local-dev defaults. Set ADMIN_EMAIL / ADMIN_PASSWORD in
// .env to override (recommended outside local dev).
//
// Idempotent: the user is found by email; re-runs re-sync the role, status
// and password hash so `npm run seed:admin` always guarantees a known-good
// admin login.
// ---------------------------------------------------------------------------
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@elysian.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Admin@12345";
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";

const seedAdmin = async () => {
    if (!ADMIN_EMAIL.includes("@")) {
        throw new Error("ADMIN_EMAIL must be a valid email address");
    }
    // Same floor as the registration validator keeps things consistent.
    if (ADMIN_PASSWORD.length < 8) {
        throw new Error("ADMIN_PASSWORD must be at least 8 characters");
    }

    await Database.sequelize.authenticate();

    // Same rounds as authServices registration hashing (bcrypt.hash(pw, 10)).
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);

    const [user, created] = await User.findOrCreate({
        where: { email: ADMIN_EMAIL },
        defaults: {
            email: ADMIN_EMAIL,
            username: ADMIN_USERNAME,
            passwordHash,
            role: Role.ADMIN,
            status: UserStatus.ACTIVE,
            countryCode: "NP",
            emailVerifiedAt: new Date(),
        },
    });

    if (created) {
        console.log(`Admin ${ADMIN_EMAIL} created`);
        return;
    }

    // Already exists — re-sync the bootstrapping guarantees without touching
    // profile fields the admin may have edited.
    const patch: { passwordHash?: string; role?: Role; status?: UserStatus } = {};
    if (user.role !== Role.ADMIN) patch.role = Role.ADMIN;
    if (user.status !== UserStatus.ACTIVE) patch.status = UserStatus.ACTIVE;
    if (!(await bcrypt.compare(ADMIN_PASSWORD, user.passwordHash))) {
        patch.passwordHash = passwordHash;
    }

    if (Object.keys(patch).length === 0) {
        console.log(`Admin ${ADMIN_EMAIL} already exists, skipping`);
        return;
    }

    await user.update(patch);
    console.log(`Admin ${ADMIN_EMAIL} already exists, re-synced (${Object.keys(patch).join(", ")})`);
};

seedAdmin()
    .catch((error) => {
        console.error("Admin seeding failed:", error);
        process.exitCode = 1;
    })
    .finally(() => Database.sequelize.close());
