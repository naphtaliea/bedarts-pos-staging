// The two reasons a seller can give for selling past the system's stock count.
// Only TRACKED_REASON records a deficit that the next stock receipt settles
// automatically (see stock_deficits). "Miscount" assumes the physical stock is
// really there and the system count is wrong.
export const TRACKED_REASON = "Stock received but not yet entered in system";
export const OVERRIDE_REASONS = [TRACKED_REASON, "Miscount"] as const;
