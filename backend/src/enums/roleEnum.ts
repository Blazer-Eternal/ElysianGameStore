// Role-based access control roles. CUSTOMER is the default; PUBLISHER owns at
// least one Publisher row; SUPPORT is read-only staff; ADMIN is full access.
export enum Role {
    CUSTOMER = "CUSTOMER",
    PUBLISHER = "PUBLISHER",
    ADMIN = "ADMIN",
    SUPPORT = "SUPPORT",
}

export const ROLES = Object.values(Role);

export const STAFF_ROLES: Role[] = [Role.ADMIN, Role.SUPPORT];
