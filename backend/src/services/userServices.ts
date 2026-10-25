import bcrypt from "bcryptjs";

import { Role } from "../enums/roleEnum";
import { UserStatus } from "../enums/userStatusEnum";
import { IUserPublic } from "../interfaces/userInterface";
import SessionRepository from "../repositories/sessionRepository";
import UserRepository from "../repositories/userRepository";
import AppError from "../utils/appError";
import { audit, AUDIT_ACTIONS } from "./auditServices";
import { toPublicUser } from "./authServices";

export const getProfile = async (userId: string): Promise<IUserPublic> => {
    const user = await UserRepository.findById(userId);
    if (!user) throw AppError.notFound("User not found");
    return toPublicUser(user);
};

export const updateProfile = async (
    userId: string,
    fields: { username?: string; countryCode?: string; birthDate?: Date },
    ip?: string,
): Promise<IUserPublic> => {
    if (fields.username) {
        const username = fields.username.toLowerCase();
        const existing = await UserRepository.findByUsername(username);
        if (existing && existing.id !== userId) {
            throw AppError.conflict("This username is taken");
        }
        fields.username = username;
    }
    await UserRepository.updateById(userId, fields);
    await audit({
        actorId: userId,
        action: "USER_PROFILE_UPDATED",
        entity: "user",
        entityId: userId,
        diff: fields,
        ip,
    });
    return getProfile(userId);
};

export const changePassword = async (
    userId: string,
    currentPassword: string,
    newPassword: string,
): Promise<void> => {
    const user = await UserRepository.findById(userId);
    if (!user) throw AppError.notFound("User not found");
    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) throw AppError.badRequest("Current password is incorrect");
    await UserRepository.updateById(userId, {
        passwordHash: await bcrypt.hash(newPassword, 10),
    });
    // Credential change kills every refresh session for the account: a token
    // issued before the change must never survive it (stolen/old devices are
    // signed out; the user logs in again with the new password). Access JWTs
    // are short-lived stateless tokens and simply age out.
    await SessionRepository.revokeAllForUser(userId);
};

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------
export const adminListUsers = async (params: {
    role?: Role;
    status?: UserStatus;
    search?: string;
    page: number;
    pageSize: number;
}) => {
    const { rows, count } = await UserRepository.list({
        role: params.role,
        status: params.status,
        search: params.search,
        limit: params.pageSize,
        offset: (params.page - 1) * params.pageSize,
    });
    return {
        users: rows.map(toPublicUser),
        total: count,
        page: params.page,
        pageSize: params.pageSize,
    };
};

// Role and status changes are the two mutations the audit trail specifically
// exists for (spec: "covers price changes, refunds, role changes").
export const adminUpdateUser = async (
    targetUserId: string,
    fields: { role?: Role; status?: UserStatus },
    adminId: string,
    ip?: string,
): Promise<IUserPublic> => {
    const user = await UserRepository.findById(targetUserId);
    if (!user) throw AppError.notFound("User not found");

    if (fields.role && fields.role !== user.role) {
        if (targetUserId === adminId) {
            throw AppError.badRequest("You cannot change your own role");
        }
        await UserRepository.updateById(targetUserId, { role: fields.role });
        await audit({
            actorId: adminId,
            action: AUDIT_ACTIONS.USER_ROLE_CHANGED,
            entity: "user",
            entityId: targetUserId,
            diff: { from: user.role, to: fields.role },
            ip,
        });
    }
    if (fields.status && fields.status !== user.status) {
        if (targetUserId === adminId) {
            throw AppError.badRequest("You cannot change your own status");
        }
        await UserRepository.updateById(targetUserId, { status: fields.status });
        await audit({
            actorId: adminId,
            action: AUDIT_ACTIONS.USER_STATUS_CHANGED,
            entity: "user",
            entityId: targetUserId,
            diff: { from: user.status, to: fields.status },
            ip,
        });
    }
    return getProfile(targetUserId);
};
