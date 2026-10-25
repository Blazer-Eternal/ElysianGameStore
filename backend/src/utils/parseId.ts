import { randomUUID } from "crypto";

import AppError from "./appError";

// Parses a :id route parameter and guarantees it is a well-formed UUID.
// Throws a 404 (not a 400) so probing for other users' ids stays uniform.
export const parseId = (value: unknown, label: string = "id"): string => {
    const uuidRe =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (typeof value !== "string" || !uuidRe.test(value)) {
        throw AppError.notFound(`Invalid ${label}`);
    }
    return value;
};

export const newId = (): string => randomUUID();

export default parseId;
