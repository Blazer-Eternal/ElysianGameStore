// Age ratings and the minimum age each one requires. Used for the mature
// content gate: a buyer's birth_date must put them at or above the required
// age at checkout and download time.
export enum AgeRating {
    E = "E", // Everyone
    T = "T", // Teen (13+)
    M = "M", // Mature (17+)
    AO = "AO", // Adults Only (18+)
}

export const AGE_RATINGS = Object.values(AgeRating);

export const AGE_REQUIREMENTS: Record<AgeRating, number> = {
    [AgeRating.E]: 0,
    [AgeRating.T]: 13,
    [AgeRating.M]: 17,
    [AgeRating.AO]: 18,
};

export const ageFromBirthDate = (birthDate: Date, now: Date = new Date()): number => {
    let age = now.getUTCFullYear() - birthDate.getUTCFullYear();
    const hadBirthday =
        now.getUTCMonth() > birthDate.getUTCMonth() ||
        (now.getUTCMonth() === birthDate.getUTCMonth() && now.getUTCDate() >= birthDate.getUTCDate());
    if (!hadBirthday) age -= 1;
    return age;
};
