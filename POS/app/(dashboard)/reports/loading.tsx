export default function ReportsLoading() {
  return (
    <div className="flex flex-col h-full">
      {/* Banner */}
      <div className="bg-white border-b border-border shrink-0">
        <div className="border-b border-border px-4 lg:px-6 py-3 lg:py-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-1 self-stretch rounded-full bg-secondary animate-pulse shrink-0" />
            <div className="h-5 w-20 rounded bg-secondary animate-pulse" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-9 w-28 rounded-lg bg-secondary animate-pulse" />
            <div className="h-9 w-28 rounded-lg bg-secondary animate-pulse" />
            <div className="h-9 w-24 rounded-xl bg-secondary animate-pulse" />
          </div>
        </div>
        {/* Tab strip */}
        <div className="flex items-center gap-1 px-4 lg:px-6 pt-3 pb-0 overflow-x-auto no-scrollbar">
          {[80, 60, 76, 108, 72, 80].map((w, i) => (
            <div key={i} className={`h-8 rounded-t bg-secondary animate-pulse shrink-0`} style={{ width: w }} />
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 lg:p-6 space-y-4 lg:space-y-6">
        {/* Stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-2xl border border-border bg-card px-5 py-4 space-y-2">
              <div className="h-2.5 w-20 rounded bg-secondary animate-pulse" />
              <div className="h-8 w-28 rounded bg-secondary animate-pulse" />
              <div className="h-2.5 w-16 rounded bg-secondary animate-pulse" />
            </div>
          ))}
        </div>

        {/* Revenue chart */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="h-4 w-36 rounded bg-secondary animate-pulse mb-5" />
          <div className="h-[200px] rounded-xl bg-secondary animate-pulse" />
        </div>

        {/* Sales table */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <div className="h-4 w-28 rounded bg-secondary animate-pulse" />
          </div>
          <div className="divide-y divide-border">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-3.5">
                <div className="h-3.5 w-24 rounded bg-secondary animate-pulse" />
                <div className="h-3.5 w-20 rounded bg-secondary animate-pulse" />
                <div className="h-3.5 flex-1 rounded bg-secondary animate-pulse" />
                <div className="h-5 w-16 rounded-full bg-secondary animate-pulse" />
                <div className="h-3.5 w-20 rounded bg-secondary animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
