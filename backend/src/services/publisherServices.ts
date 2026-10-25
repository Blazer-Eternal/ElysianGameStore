import { PayoutCurrency } from "../enums/payoutCurrencyEnum";
import { PublisherStatus } from "../enums/publisherStatusEnum";
import { Role } from "../enums/roleEnum";
import Publisher from "../models/publisherModel";
import PublisherRepository from "../repositories/publisherRepository";
import UserRepository from "../repositories/userRepository";
import AppError from "../utils/appError";
import { audit, AUDIT_ACTIONS } from "./auditServices";
import { Action, assertCan } from "./accessControl";

const toPublic = (p: Publisher) => ({
    id: p.id,
    name: p.name,
    legalName: p.legalName,
    taxId: p.taxId,
    payoutAccount: p.payoutAccount,
    payoutCurrency: p.payoutCurrency,
    revenueSharePct: p.revenueSharePct,
    status: p.status,
    ownerUserId: p.ownerUserId,
    createdAt: p.createdAt,
});

// A customer applies to become a publisher. The account is created
// UNVERIFIED; games cannot be published until an admin verifies it.
export const apply = async (
    userId: string,
    body: {
        name: string;
        legalName: string;
        taxId?: string;
        payoutAccount?: string;
        payoutCurrency?: PayoutCurrency;
        revenueSharePct?: number;
    },
    ip?: string,
) => {
    const existing = await PublisherRepository.findByOwnerUserId(userId);
    if (existing) throw AppError.conflict("You already have a publisher account");

    const publisher = await PublisherRepository.create({
        name: body.name,
        legalName: body.legalName,
        taxId: body.taxId ?? null,
        payoutAccount: body.payoutAccount ?? null,
        payoutCurrency: body.payoutCurrency ?? PayoutCurrency.NPR,
        revenueSharePct: body.revenueSharePct ?? 70,
        status: PublisherStatus.UNVERIFIED,
        ownerUserId: userId,
    });

    const user = await UserRepository.findById(userId);
    if (user && user.role === Role.CUSTOMER) {
        await UserRepository.updateById(userId, { role: Role.PUBLISHER });
    }

    await audit({
        actorId: userId,
        action: AUDIT_ACTIONS.PUBLISHER_APPLIED,
        entity: "publisher",
        entityId: publisher.id,
        diff: { name: body.name },
        ip,
    });

    return toPublic(publisher);
};

export const getMine = async (userId: string) => {
    const publisher = await PublisherRepository.findByOwnerUserId(userId);
    if (!publisher) throw AppError.notFound("You do not have a publisher account");
    return toPublic(publisher);
};

// Returns the publisher owned by this user (asserting the caller may act on
// the publisher domain at all). Every /publisher/* route starts with this.
export const requireOwnedPublisher = async (userId: string): Promise<Publisher> => {
    const publisher = await PublisherRepository.findByOwnerUserId(userId);
    if (!publisher) {
        throw AppError.notFound("You do not have a publisher account");
    }
    return publisher;
};

// Publishing (games going live) additionally requires VERIFIED status.
export const requireVerifiedPublisher = async (userId: string): Promise<Publisher> => {
    const publisher = await requireOwnedPublisher(userId);
    if (publisher.status !== PublisherStatus.VERIFIED) {
        throw AppError.forbidden("Your publisher account is not verified yet");
    }
    return publisher;
};

export const updateMine = async (
    userId: string,
    fields: {
        name?: string;
        legalName?: string;
        taxId?: string;
        payoutAccount?: string;
        payoutCurrency?: PayoutCurrency;
    },
    ip?: string,
) => {
    const publisher = await requireOwnedPublisher(userId);
    await PublisherRepository.updateById(publisher.id, fields);
    await audit({
        actorId: userId,
        action: "PUBLISHER_UPDATED",
        entity: "publisher",
        entityId: publisher.id,
        diff: fields,
        ip,
    });
    return getMine(userId);
};

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------
export const adminList = async (params: {
    status?: PublisherStatus;
    page: number;
    pageSize: number;
}) => {
    const { rows, count } = await PublisherRepository.list({
        status: params.status,
        limit: params.pageSize,
        offset: (params.page - 1) * params.pageSize,
    });
    return {
        publishers: rows.map(toPublic),
        total: count,
        page: params.page,
        pageSize: params.pageSize,
    };
};

export const adminSetStatus = async (
    publisherId: string,
    status: PublisherStatus,
    adminId: string,
    ip?: string,
) => {
    const publisher = await PublisherRepository.findById(publisherId);
    if (!publisher) throw AppError.notFound("Publisher not found");
    await PublisherRepository.updateById(publisherId, { status });
    await audit({
        actorId: adminId,
        action: AUDIT_ACTIONS.PUBLISHER_STATUS_CHANGED,
        entity: "publisher",
        entityId: publisherId,
        diff: { from: publisher.status, to: status },
        ip,
    });
    // Re-read: the audit trail needs the *old* status, the caller needs the
    // new one. Returning the pre-update instance here used to hand back
    // status: UNVERIFIED even after a successful verify.
    const updated = await PublisherRepository.findById(publisherId);
    return toPublic(updated ?? publisher);
};

export { assertCan, toPublic as toPublicPublisher };
