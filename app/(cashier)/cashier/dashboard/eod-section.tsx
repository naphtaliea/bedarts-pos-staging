"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReconciliationForm } from "./reconciliation-form";

export function EODSection() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="rounded-xl border border-border bg-card p-5 flex items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="shrink-0 w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <ClipboardCheck className="w-5 h-5 text-primary" aria-hidden />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">End of Day</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Count your drawer and submit your shift reconciliation
            </p>
          </div>
        </div>
        <Button onClick={() => setOpen(true)} className="shrink-0">
          Reconcile
        </Button>
      </div>

      {open && (
        <ReconciliationForm
          onClose={() => setOpen(false)}
          onSuccess={() => {
            setOpen(false);
            // Session closed server-side; send them back to the PIN screen
            router.replace("/cashier/pin");
            router.refresh();
          }}
        />
      )}
    </>
  );
}
