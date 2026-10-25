import { DiscountType } from "../enums/discountTypeEnum";
import { Role } from "../enums/roleEnum";
import Coupon from "../models/couponModel";
import { CouponRepository } from "../repositories";
import AppError from "../utils/appError";
import { audit, AUDIT_ACTIONS } from "./auditServices";

const toPublic = (c: Coupon) => ({
    id: c.id,
    code: c.code,
    discountType: c.discountType,
    value: c.value,
    maxUses: c.maxUses,
    usedCount: c.usedCount,
    perUserLimit: c.perUserLimit,
    minOrderPaisa: c.minOrderPaisa,
    expiresAt: c.expiresAt,
    isActive: c.isActive,
});

// Admin CRUD for coupons. Validation at checkout (expiry, caps, min order,
// per-user limit) lives in pricingServices; redemption counts are enforced
// atomically in couponRepository.reserveAtomic.
export const listAll = async () => (await CouponRepository.listAll()).map(toPublic);

export const create = async (
    adminId: string,
    body: {
        code: string;
        discountType: DiscountType;
        value: number;
        maxUses: number;
        perUserLimit?: number;
        minOrderPaisa?: number;
        expiresAt?: Date;
        isActive?: boolean;
    },
    ip?: string,
) => {
    const code = body.code.toUpperCase();
    if (await CouponRepository.findByCode(code)) {
        throw AppError.conflict("A coupon with this code already exists");
    }
    if (body.discountType === DiscountType.PERCENT && (body.value < 1 || body.value > 90)) {
        throw AppError.badRequest("Percent coupons must be between 1 and 90");
    }
    if (body.discountType === DiscountType.FIXED && body.value <= 0) {
        throw AppError.badRequest("Fixed coupons must carry a positive paisa value");
    }

    const coupon = await CouponRepository.create({
        code,
        discountType: body.discountType,
        value: body.value,
        maxUses: body.maxUses,
        usedCount: 0,
        perUserLimit: body.perUserLimit ?? null,
        minOrderPaisa: body.minOrderPaisa ?? 0,
        expiresAt: body.expiresAt ?? null,
        isActive: body.isActive ?? true,
    });

    await audit({
        actorId: adminId,
        action: AUDIT_ACTIONS.COUPON_CREATED,
        entity: "coupon",
        entityId: coupon.id,
        diff: { code, value: body.value },
        ip,
    });
    return toPublic(coupon);
};

export const update = async (
    adminId: string,
    couponId: string,
    body: Partial<{
        maxUses: number;
        perUserLimit: number;
        minOrderPaisa: number;
        expiresAt: Date;
        isActive: boolean;
    }>,
    ip?: string,
) => {
    const coupon = await CouponRepository.findById(couponId);
    if (!coupon) throw AppError.notFound("Coupon not found");
    if (body.maxUses !== undefined && body.maxUses < coupon.usedCount) {
        throw AppError.badRequest(
            `maxUses cannot go below the ${coupon.usedCount} uses already redeemed`,
        );
    }
    await CouponRepository.updateById(couponId, body);
    await audit({
        actorId: adminId,
        action: AUDIT_ACTIONS.COUPON_UPDATED,
        entity: "coupon",
        entityId: couponId,
        diff: body,
        ip,
    });
    return CouponRepository.findById(couponId);
};

export const remove = async (adminId: string, couponId: string, ip?: string) => {
    const coupon = await CouponRepository.findById(couponId);
    if (!coupon) throw AppError.notFound("Coupon not found");
    await CouponRepository.deleteById(couponId);
    await audit({
        actorId: adminId,
        action: "COUPON_DELETED",
        entity: "coupon",
        entityId: couponId,
        ip,
    });
};

export { Role };
