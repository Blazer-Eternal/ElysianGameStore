import { PayoutCurrency } from "../enums/payoutCurrencyEnum";
import { PublisherStatus } from "../enums/publisherStatusEnum";

// revenue_share_pct: the publisher's cut (0-100, default 70); the store keeps
// the remainder as commission. Must be VERIFIED before any game goes live.
export interface IPublisher {
    id: string;
    name: string;
    legalName: string;
    taxId?: string | null; // PAN/VAT
    payoutAccount?: string | null;
    payoutCurrency: PayoutCurrency;
    revenueSharePct: number;
    status: PublisherStatus;
    ownerUserId: string;
    createdAt: Date;
    updatedAt: Date;
}

export type IPublisherCreation = Omit<IPublisher, "id" | "createdAt" | "updatedAt">;
