// ---------------------------------------------------------------------------
// Money helpers. Everything in this codebase is integer paisa (1 NPR = 100
// paisa). Rs 999 is 99900. No floats ever touch a stored amount; divisions
// are floored/rounded explicitly and allocations use the largest-remainder
// method so that per-item figures always sum back to the order figure.
// ---------------------------------------------------------------------------

export const NPR_PER_PAISA = 100;

/** Rs → paisa (integer, never use floats for storage). */
export const toPaisa = (rupees: number): number => Math.round(rupees * NPR_PER_PAISA);

/** Paisa → rupees, for display only (Intl formatting). */
export const toRupees = (paisa: number): number => paisa / NPR_PER_PAISA;

/** Intl currency formatter for the frontend/API responses. */
export const formatNpr = (paisa: number): string =>
    new Intl.NumberFormat("en-NP", { style: "currency", currency: "NPR" }).format(
        toRupees(paisa),
    );

/** Percentage discount, floored (store always loses ≤ 1 paisa per item). */
export const percentOff = (amount: number, pct: number): number =>
    Math.floor((amount * pct) / 100);

/** Basis-points amount (VAT 13% = 1300 bps), rounded once. */
export const bpsAmount = (amount: number, bps: number): number =>
    Math.round((amount * bps) / 10000);

/**
 * Largest-remainder allocation: split `total` across `weights` using integer
 * arithmetic so the parts sum back to exactly `total`. Used to spread coupon
 * discounts, fixed promotions and order tax across order items without ever
 * creating or destroying a paisa.
 */
export const allocateProportional = (total: number, weights: number[]): number[] => {
    const n = weights.length;
    if (n === 0) return [];
    const weightSum = weights.reduce((a, b) => a + b, 0);
    if (total === 0 || weightSum === 0) return new Array(n).fill(0);

    const exact = weights.map((w) => (total * w) / weightSum);
    const floors = exact.map((v) => Math.floor(v));
    let remainder = total - floors.reduce((a, b) => a + b, 0);

    const byRemainder = exact
        .map((v, i) => ({ i, frac: v - Math.floor(v) }))
        .sort((a, b) => b.frac - a.frac || a.i - b.i);

    const result = [...floors];
    for (let k = 0; remainder > 0 && k < byRemainder.length; k += 1) {
        result[byRemainder[k].i] += 1;
        remainder -= 1;
    }
    return result;
};

export const clamp = (value: number, min: number, max: number): number =>
    Math.min(Math.max(value, min), max);
