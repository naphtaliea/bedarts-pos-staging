"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { endShift } from "./actions";

export function EndShiftButton() {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setLoading(true);
    setError(null);
    const res = await endShift();
    if (res.error) {
      setError(res.error);
      setLoading(false);
      return;
    }
    router.replace("/cashier/pin");
    router.refresh();
  }

  return (
    <>
      <div className="rounded-xl border border-border bg-card p-5 flex items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="shrink-0 w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
            <LogOut className="w-5 h-5 text-muted-foreground" aria-hidden />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">End Shift</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Hand over the drawer and close your session for today
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={() => setConfirming(true)} className="shrink-0">
          End Shift
        </Button>
      </div>

      {confirming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-sm bg-card rounded-2xl shadow-2xl p-6 space-y-4">
            <div>
              <p className="text-base font-semibold text-foreground">End your shift?</p>
              <p className="text-sm text-muted-foreground mt-1">
                Your session will close and you won&apos;t be able to make sales until tomorrow.
              </p>
            </div>
            {error && (
              <p className="text-xs text-destructive bg-destructive/8 rounded-lg px-3 py-2">{error}</p>
            )}
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setConfirming(false)} disabled={loading}>
                Cancel
              </Button>
              <Button onClick={handleConfirm} disabled={loading} className="gap-2">
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {loading ? "Closing…" : "Yes, end shift"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
