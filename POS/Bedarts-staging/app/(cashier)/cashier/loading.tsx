export default function CashierLoading() {
  return (
    <div className="flex flex-col h-dvh bg-white select-none overflow-hidden">
      {/* Topbar — h-12, matches PosTopBar exactly */}
      <div className="h-12 flex items-stretch bg-white border-b border-border shrink-0">
        <div className="flex items-center gap-2 px-3 border-r border-border shrink-0 min-w-[140px]">
          <div className="w-7 h-7 rounded shrink-0" />
          <div className="h-6 w-20 rounded bg-slate-100 animate-pulse" />
        </div>
        {/* Tabs area */}
        <div className="flex items-stretch flex-1 min-w-0">
          <div className="flex items-center px-4 gap-2 border-r border-border">
            <div className="h-4 w-16 rounded bg-slate-100 animate-pulse" />
          </div>
        </div>
        {/* Right: clock + icons + avatar + logout */}
        <div className="flex items-stretch border-l border-border shrink-0">
          <div className="hidden sm:flex items-center px-3 border-r border-border">
            <div className="h-3 w-12 rounded bg-slate-100 animate-pulse" />
          </div>
          <div className="w-11 border-r border-border" />
          <div className="w-11 border-r border-border" />
          <div className="w-11 border-r border-border" />
          <div className="flex items-center gap-2 px-3 border-l border-border">
            <div className="w-7 h-7 rounded-full bg-slate-100 animate-pulse shrink-0" />
            <div className="hidden sm:block h-3 w-14 rounded bg-slate-100 animate-pulse" />
          </div>
          <div className="w-11" />
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Left panel — order + numpad */}
        <section className="hidden lg:flex flex-col bg-white w-2/5 shrink-0">
          {/* Order header */}
          <div className="shrink-0 flex items-center px-3 py-1 border-b border-border h-9">
            <div className="h-3 w-10 rounded bg-slate-100 animate-pulse" />
          </div>
          {/* Empty cart state */}
          <div className="flex-1 flex flex-col items-center justify-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 animate-pulse" />
            <div className="h-3 w-20 rounded bg-slate-100 animate-pulse" />
            <div className="h-3 w-28 rounded bg-slate-100 animate-pulse" />
          </div>
          {/* Numpad */}
          <div className="shrink-0 bg-secondary/40 border-t border-border p-2 space-y-1.5">
            <div className="h-8 rounded" />
            <div className="grid grid-cols-4 gap-1">
              {Array.from({ length: 16 }).map((_, i) => (
                <div key={i} className="h-12 rounded-xl bg-slate-200 animate-pulse" />
              ))}
            </div>
          </div>
          {/* Pay button */}
          <div className="shrink-0 px-2.5 pb-2.5 pt-1.5 bg-white border-t border-border">
            <div className="h-16 rounded-xl bg-slate-200 animate-pulse" />
          </div>
        </section>

        {/* Right panel — product browser */}
        <section className="flex flex-col flex-1 min-w-0 bg-secondary/30">
          {/* Search */}
          <div className="shrink-0 px-4 pt-3 pb-2">
            <div className="h-11 rounded-2xl bg-slate-200 animate-pulse w-full" />
          </div>
          {/* Category chips */}
          <div className="shrink-0 px-4 pb-2 flex gap-2">
            {[56, 48, 64, 52, 72].map((w, i) => (
              <div key={i} className="h-9 rounded-full bg-slate-200 animate-pulse shrink-0" style={{ width: w }} />
            ))}
          </div>
          {/* Product grid */}
          <div className="flex-1 min-h-0 px-4 pb-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 content-start overflow-hidden">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden shadow-sm">
                <div className="w-full aspect-[3/2] bg-slate-200 animate-pulse" />
                <div className="p-2.5 space-y-2">
                  <div className="h-3.5 rounded bg-slate-200 animate-pulse w-4/5" />
                  <div className="h-5 rounded bg-slate-200 animate-pulse w-2/5" />
                  <div className="h-3 rounded bg-slate-100 animate-pulse w-1/3" />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
