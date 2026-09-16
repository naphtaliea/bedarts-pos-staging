"use client";

import { useState } from "react";
import { ClipboardCheck, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReconciliationForm } from "./reconciliation-form";

interface EODSectionProps {
  cashSalesTotal: number;
}

export function EODSection({ cashSalesTotal }: EODSectionProps) {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <div className="rounded-xl border border-success/30 bg-success/5 p-5 flex items-center gap-3">
        <CheckCircle2 className="h-5 w-5 text-success shrink-0" aria-hidden />
        <div>
          <p className="text-sm font-semibold text-foreground">EOD Reconciliation Submitted</p>
          <p className="text-xs text-muted-foreground mt-0.5">Your end-of-day figures have been recorded.</p>
        </div>
      </div>
    );
  }

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
          cashSalesTotal={cashSalesTotal}
          onClose={() => setOpen(false)}
          onSuccess={() => {
            setOpen(false);
            setDone(true);
          }}
        />
      )}
    </>
  );
}
