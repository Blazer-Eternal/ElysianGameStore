import { Response } from "express";

import { Role } from "../../enums/roleEnum";
import { UserStatus } from "../../enums/userStatusEnum";
import { AppRequest as Request } from "../../interfaces";
import { asyncHandler } from "../../middleware/exceptionHandler";
import { userServices } from "../../services";
import { sendSuccess } from "../../utils/response";

export const getProfile = asyncHandler(async (req: Request, res: Response) => {
    const user = await userServices.getProfile(req.user!.sub);
    sendSuccess(res, { user });
});

export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
    const user = await userServices.updateProfile(req.user!.sub, req.body, req.ip);
    sendSuccess(res, { user }, "Profile updated");
});

export const changePassword = asyncHandler(async (req: Request, res: Response) => {
    await userServices.changePassword(
        req.user!.sub,
        req.body.currentPassword,
        req.body.newPassword,
    );
    sendSuccess(res, null, "Password changed");
});

// ---------------------------------------------------------------------------
// Admin — user management. Role/status changes write to the audit trail
// inside userServices.adminUpdateUser (spec: the audit trail covers role
// changes); admins cannot demote or suspend themselves.
// ---------------------------------------------------------------------------
export const adminListUsers = asyncHandler(async (req: Request, res: Response) => {
    const q = req.query as Record<string, string | undefined>;
    const result = await userServices.adminListUsers({
        role: q.role as Role | undefined,
        status: q.status as UserStatus | undefined,
        search: q.search,
        page: Number(q.page ?? 1),
        pageSize: Number(q.pageSize ?? 12),
    });
    sendSuccess(res, result);
});

export const adminUpdateUser = asyncHandler(async (req: Request, res: Response) => {
    const user = await userServices.adminUpdateUser(
        String(req.params.id),
        req.body as { role?: Role; status?: UserStatus },
        req.user!.sub,
        req.ip,
    );
    sendSuccess(res, { user }, "User updated");
});
