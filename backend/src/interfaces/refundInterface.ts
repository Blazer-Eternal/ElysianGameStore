import { RefundStatus } from "../enums/refundStatusEnum";

// One refund per order item (unique). Eligibility: purchased < 14 days ago
// AND total playtime < 2 hrs — auto-approved when eligible, PENDING otherwise.
export interface IRefund {
    id: string;
    orderItemId: string;
    reason: string;
    amountPaisa: number;
    status: RefundStatus;
    requestedAt: Date;
    decidedBy?: string | null;
    decidedAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

export type IRefundCreation = Omit<IRefund, "id" | "createdAt" | "updatedAt">;
