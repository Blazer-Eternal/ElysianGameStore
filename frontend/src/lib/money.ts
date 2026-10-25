// Money is integer paisa everywhere (1 NPR = 100 paisa). The UI formats it;
// it never does arithmetic beyond display. Nepali digit grouping (lakh /
// crore: 1,20,000) via en-IN, which matches how NPR is actually written.

const GROUPING = "en-IN";

export const paisaToNpr = (paisa: number, opts: { symbol?: boolean } = {}): string => {
    const { symbol = true } = opts;
    const rupees = paisa / 100;
    const hasPaisa = paisa % 100 !== 0;
    const formatted = new Intl.NumberFormat(GROUPING, {
        minimumFractionDigits: hasPaisa ? 2 : 0,
        maximumFractionDigits: hasPaisa ? 2 : 0,
    }).format(rupees);
    return symbol ? `Rs ${formatted}` : formatted;
};

/** "Rs 1,999" with the struck-through base price beside a discount. */
export const discountPercent = (basePaisa: number, currentPaisa: number): number | null => {
    if (basePaisa <= 0 || currentPaisa >= basePaisa) return null;
    return Math.round(((basePaisa - currentPaisa) / basePaisa) * 100);
};

/** 1450000000 ms -> "24 May 2026" (Nepali-market stores write dates plainly) */
export const formatDate = (iso: string | Date): string =>
    new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
    }).format(new Date(iso));

/** Runtime estimate from minutes, for playtime and review metadata. */
export const formatPlaytime = (minutes: number): string => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return rest === 0 ? `${hours} hr` : `${hours} hr ${rest} min`;
};

/** File size for build listings. */
export const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    const units = ["KB", "MB", "GB", "TB"];
    let value = bytes;
    let unit = -1;
    do {
        value /= 1024;
        unit += 1;
    } while (value >= 1024 && unit < units.length - 1);
    return `${value >= 100 ? Math.round(value) : value.toFixed(1)} ${units[unit]}`;
};
