export interface ITag {
    id: string;
    name: string;
    slug: string;
    createdAt: Date;
    updatedAt: Date;
}

export type ITagCreation = Omit<ITag, "id" | "createdAt" | "updatedAt">;
