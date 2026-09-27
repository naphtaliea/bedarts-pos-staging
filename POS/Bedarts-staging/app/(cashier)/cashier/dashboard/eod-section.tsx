"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardCheck, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReconciliationForm } from "./reconciliation-form";
import { AdminReconciliationForm } from "./admin-reconciliation-form";

interface EODSectionProps {
  role: string;
  grossSales: number;
  cashSales: number;
  momoSales: number;
  posSales: number;
  todayExpenses: number;
}

export function EODSection({ role, grossSales, cashSales, momoSales, posSales, todayExpenses }: EODSectionProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const isAdmin = role === "admin" || role === "manager";

  const handleSuccess = () => {
    setOpen(false);
    router.replace("/cashier/pin");
    router.refresh();
  };

  if (!isAdmin) {
    return (
      <>
        <div className="rounded-xl border border-border bg-card p-5 flex items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="shrink-0 w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-primary" aria-hidden />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">End of Shift</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Count your cash drawer and submit to close your shift
              </p>
            </div>
          </div>
          <Button onClick={() => setOpen(true)} className="shrink-0">Count Cash</Button>
        </div>

        {open && (
          <ReconciliationForm
            onClose={() => setOpen(false)}
            onSuccess={handleSuccess}
          />
        )}
      </>
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
              Review cashier counts, add any expenses, and close the day
            </p>
          </div>
        </div>
        <Button onClick={() => setOpen(true)} className="shrink-0">Reconcile</Button>
      </div>

      {open && (
        <AdminReconciliationForm
          onClose={() => setOpen(false)}
          onSuccess={handleSuccess}
          grossSales={grossSales}
          cashSales={cashSales}
          momoSales={momoSales}
          posSales={posSales}
          todayExpenses={todayExpenses}
        />
      )}
    </>
  );
}
