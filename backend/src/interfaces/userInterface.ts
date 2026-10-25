import { Role } from "../enums/roleEnum";
import { UserStatus } from "../enums/userStatusEnum";

export interface IUser {
    id: string;
    email: string;
    username: string;
    passwordHash: string;
    role: Role;
    countryCode?: string | null;
    birthDate?: Date | null;
    status: UserStatus;
    emailVerifiedAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

export type IUserCreation = Omit<IUser, "id" | "createdAt" | "updatedAt">;

// Safe shape returned to clients (never includes passwordHash).
export interface IUserPublic {
    id: string;
    email: string;
    username: string;
    role: Role;
    countryCode?: string | null;
    birthDate?: Date | null;
    status: UserStatus;
    emailVerifiedAt?: Date | null;
    createdAt: Date;
}
