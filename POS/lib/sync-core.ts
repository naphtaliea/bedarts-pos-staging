// Pure sync logic for the offline sale queue — no React, no IndexedDB — so the
// rules can be unit-tested. The rule that matters: a queued sale is removed from
// the device ONLY when the server confirms it saved ("synced"). Every other
// outcome keeps the sale and says why.

export type SubmitResult =
  | { ok: true; saleId: string }
  | { ok: false; stockInsufficient: string[] }
  | { ok: false; error: string; code: "pin" | "rejected" };

export type SyncStatus = "pending" | "needs_reason" | "needs_pin" | "failed";

export type SyncOutcome =
  | { kind: "synced" }
  | { kind: "network" }                        // couldn't reach the server — leave queued, try again
  | { kind: "stale" }                          // this page is older than the server — reload, then retry
  | { kind: "needs_reason"; items: string[] }  // server is short of stock; a reason is needed to record it
  | { kind: "needs_pin" }                      // PIN session ended; sign in again
  | { kind: "failed"; error: string };        // server refused the sale; a person has to look at it

// What a till running an old build gets back from a newer server (Next.js).
const STALE_PATTERN = /server action not found|unexpected response was received from the server|failed to find server action/i;

export function isStaleDeployError(message: string): boolean {
  return STALE_PATTERN.test(message);
}

export async function attemptSync(
  sale: { id: string; payload: object },
  submit: (args: never) => Promise<SubmitResult>,
  opts: { overrideReason?: string } = {}
): Promise<SyncOutcome> {
  const args = {
    ...sale.payload,
    // The queued sale's own id is the idempotency key: retrying a sale the server
    // already saved returns that sale instead of recording a second one.
    clientRef: sale.id,
    ...(opts.overrideReason ? { stockOverrideReason: opts.overrideReason } : {}),
  };

  let result: SubmitResult;
  try {
    result = await submit(args as never);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return isStaleDeployError(message) ? { kind: "stale" } : { kind: "network" };
  }

  if (result.ok) return { kind: "synced" };
  if ("stockInsufficient" in result) return { kind: "needs_reason", items: result.stockInsufficient };
  if (result.code === "pin") return { kind: "needs_pin" };
  return { kind: "failed", error: result.error };
}
