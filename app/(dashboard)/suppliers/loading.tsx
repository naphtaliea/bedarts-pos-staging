export default function SuppliersLoading() {
  return (
    <div className="flex flex-col h-full">
      {/* Banner */}
      <div className="bg-white border-b border-border shrink-0">
        <div className="border-b border-border px-4 lg:px-6 py-3 lg:py-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 lg:gap-6">
            <div className="w-1 self-stretch rounded-full bg-secondary animate-pulse shrink-0" />
            <div className="h-5 w-24 rounded bg-secondary animate-pulse" />
            <div className="flex items-center gap-1">
              {["Suppliers", "Purchases", "Payables"].map((_, i) => (
                <div key={i} className="h-7 w-20 rounded bg-secondary animate-pulse" />
              ))}
            </div>
          </div>
          <div className="h-9 w-32 rounded-xl bg-secondary animate-pulse" />
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto p-4 lg:p-6">
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          {/* Column headers */}
          <div className="flex items-center gap-4 px-5 py-3 border-b border-border bg-secondary/30">
            <div className="h-3 w-28 rounded bg-secondary animate-pulse" />
            <div className="h-3 w-20 rounded bg-secondary animate-pulse" />
            <div className="h-3 flex-1 rounded bg-secondary animate-pulse" />
            <div className="h-3 w-20 rounded bg-secondary animate-pulse" />
            <div className="h-3 w-8 rounded bg-secondary animate-pulse" />
          </div>
          {/* Rows */}
          {[...Array(8)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-3.5 border-b border-border last:border-0">
              <div className="h-3.5 w-28 rounded bg-secondary animate-pulse" />
              <div className="h-3.5 w-20 rounded bg-secondary animate-pulse" />
              <div className="h-3.5 flex-1 rounded bg-secondary animate-pulse" />
              <div className="h-3.5 w-20 rounded bg-secondary animate-pulse" />
              <div className="h-7 w-7 rounded-lg bg-secondary animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
