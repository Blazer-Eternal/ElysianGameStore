import { SystemRequirementType } from "../enums/systemRequirementTypeEnum";

// Unique (gameId, type). REC must be >= MIN on ramGb and storageGb
// (checked in gameServices when both rows exist).
export interface ISystemRequirement {
    id: string;
    gameId: string;
    type: SystemRequirementType;
    os: string;
    cpu: string;
    gpu: string;
    ramGb: number;
    storageGb: number;
    directx?: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export type ISystemRequirementCreation = Omit<
    ISystemRequirement,
    "id" | "createdAt" | "updatedAt"
>;
