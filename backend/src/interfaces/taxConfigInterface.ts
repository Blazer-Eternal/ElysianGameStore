// VAT lives in the database, never hard-coded: the row with the latest
// effectiveFrom (<= now) wins. rateBps: 1300 = 13%.
export interface ITaxConfig {
    id: string;
    name: string;
    rateBps: number;
    effectiveFrom: Date;
    createdAt: Date;
}

export type ITaxConfigCreation = Omit<ITaxConfig, "id" | "createdAt">;
