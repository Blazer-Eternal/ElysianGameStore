// Every game must have both a MIN and a REC requirement row before it can be
// published; REC must be >= MIN on RAM and storage (checked in services).
export enum SystemRequirementType {
    MIN = "MIN",
    REC = "REC",
}

export const SYSTEM_REQUIREMENT_TYPES = Object.values(SystemRequirementType);
