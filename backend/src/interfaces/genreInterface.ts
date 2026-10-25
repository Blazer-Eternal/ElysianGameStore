export interface IGenre {
    id: string;
    name: string;
    slug: string;
    createdAt: Date;
    updatedAt: Date;
}

export type IGenreCreation = Omit<IGenre, "id" | "createdAt" | "updatedAt">;
