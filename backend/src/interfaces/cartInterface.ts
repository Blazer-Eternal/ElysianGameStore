// One cart per user for life (unique user_id); it is emptied as orders are
// paid, not replaced.
export interface ICart {
    id: string;
    userId: string;
    createdAt: Date;
    updatedAt: Date;
}

export type ICartCreation = Omit<ICart, "id" | "createdAt" | "updatedAt">;
