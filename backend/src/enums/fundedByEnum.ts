// Who pays for the discount. STORE-funded is created by admins; PUBLISHER-
// funded promotions are created by publishers for their own games only.
export enum FundedBy {
    STORE = "STORE",
    PUBLISHER = "PUBLISHER",
}

export const FUNDED_BY = Object.values(FundedBy);
