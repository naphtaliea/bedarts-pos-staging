export default function OrdersLoading() {
  return (
    <div className="flex flex-col h-dvh bg-background overflow-hidden">
      {/* Topbar — h-12 */}
      <div className="h-12 flex items-stretch bg-white border-b border-border shrink-0">
        <div className="flex items-center gap-2 px-3 border-r border-border shrink-0 min-w-[140px]">
          <div className="w-7 h-7 rounded shrink-0" />
          <div className="h-6 w-20 rounded bg-slate-100 animate-pulse" />
        </div>
        <div className="flex-1 flex items-center px-4">
          <div className="h-4 w-16 rounded bg-slate-100 animate-pulse" />
        </div>
        <div className="flex items-stretch border-l border-border shrink-0">
          <div className="hidden sm:flex items-center px-3 border-r border-border">
            <div className="h-3 w-12 rounded bg-slate-100 animate-pulse" />
          </div>
          <div className="w-11 border-r border-border" />
          <div className="w-11 border-r border-border" />
          <div className="w-11 border-r border-border" />
          <div className="flex items-center gap-2 px-3 border-l border-border">
            <div className="w-7 h-7 rounded-full bg-slate-100 animate-pulse" />
            <div className="hidden sm:block h-3 w-14 rounded bg-slate-100 animate-pulse" />
          </div>
          <div className="w-11" />
        </div>
      </div>

      {/* Sub-header */}
      <div className="shrink-0 border-b border-border px-4 lg:px-6 py-2 flex items-center justify-between gap-3 bg-white">
        <div className="h-4 w-36 rounded bg-slate-100 animate-pulse" />
        <div className="flex items-center gap-2">
          <div className="h-8 w-44 rounded-lg bg-slate-100 animate-pulse" />
          <div className="h-8 w-20 rounded-lg bg-slate-100 animate-pulse" />
          <div className="h-8 w-24 rounded-lg bg-slate-100 animate-pulse" />
        </div>
      </div>

      {/* Orders table */}
      <div className="flex-1 flex flex-col min-h-0 px-5 py-3 max-w-5xl mx-auto w-full gap-3">
        <div className="flex-1 min-h-0 rounded-xl border border-border bg-card overflow-hidden flex flex-col">
          {/* Table header */}
          <div className="shrink-0 border-b border-border bg-secondary/70 px-4 py-2.5 grid grid-cols-5 gap-4">
            {[80, 56, 40, 64, 72].map((w, i) => (
              <div key={i} className="h-3 rounded bg-slate-200 animate-pulse" style={{ width: w }} />
            ))}
          </div>
          {/* Rows */}
          <div className="flex-1 overflow-hidden divide-y divide-border">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="px-4 py-3 flex items-center gap-4">
                <div className="h-4 w-20 rounded bg-slate-100 animate-pulse font-mono" />
                <div className="h-4 w-14 rounded bg-slate-100 animate-pulse" />
                <div className="h-4 w-6 rounded bg-slate-100 animate-pulse mx-auto" />
                <div className="h-5 w-16 rounded-full bg-slate-100 animate-pulse" />
                <div className="h-4 w-20 rounded bg-slate-100 animate-pulse ml-auto" />
                <div className="h-7 w-20 rounded-lg bg-slate-100 animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
