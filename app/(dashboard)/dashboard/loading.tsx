// Skeleton shown while the dashboard server component fetches its 5 parallel queries
export default function DashboardLoading() {
  return (
    <div>
      {/* Banner */}
      <div className="border-b border-border px-4 lg:px-6 py-4 lg:py-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-1 h-10 rounded-full bg-secondary animate-pulse" />
          <div className="space-y-1.5">
            <div className="h-2.5 w-28 rounded bg-secondary animate-pulse" />
            <div className="h-7 w-36 rounded bg-secondary animate-pulse" />
          </div>
        </div>
        <div className="h-10 w-10 rounded-xl bg-secondary animate-pulse" />
      </div>

      <div className="p-4 lg:p-6 space-y-4 lg:space-y-6 max-w-[1400px] mx-auto">
        {/* Primary stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-2xl border border-border bg-card p-4 space-y-3">
              <div className="h-3 w-20 rounded bg-secondary animate-pulse" />
              <div className="h-7 w-24 rounded bg-secondary animate-pulse" />
              <div className="h-2.5 w-16 rounded bg-secondary animate-pulse" />
            </div>
          ))}
        </div>

        {/* Secondary stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="rounded-2xl border border-border bg-card p-4 space-y-3">
              <div className="h-3 w-20 rounded bg-secondary animate-pulse" />
              <div className="h-7 w-14 rounded bg-secondary animate-pulse" />
              <div className="h-2.5 w-24 rounded bg-secondary animate-pulse" />
            </div>
          ))}
        </div>

        {/* P&L panel */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-3 border-b border-border flex gap-4">
            <div className="h-8 w-24 rounded-xl bg-secondary animate-pulse" />
            <div className="h-8 w-24 rounded-xl bg-secondary animate-pulse" />
          </div>
          <div className="p-5 grid grid-cols-2 lg:grid-cols-4 gap-5">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-3 w-20 rounded bg-secondary animate-pulse" />
                <div className="h-6 w-24 rounded bg-secondary animate-pulse" />
              </div>
            ))}
          </div>
        </div>

        {/* Revenue chart + category donut */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
          <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-5">
            <div className="h-4 w-32 rounded bg-secondary animate-pulse mb-5" />
            <div className="h-[200px] rounded-xl bg-secondary animate-pulse" />
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="h-3 w-28 rounded bg-secondary animate-pulse mb-1" />
            <div className="h-5 w-24 rounded bg-secondary animate-pulse mb-4" />
            <div className="h-[160px] rounded-full w-[144px] mx-auto bg-secondary animate-pulse" />
            <div className="space-y-2 mt-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-secondary animate-pulse shrink-0" />
                  <div className="h-3 flex-1 rounded bg-secondary animate-pulse" />
                  <div className="h-3 w-8 rounded bg-secondary animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Peak hours */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="h-4 w-44 rounded bg-secondary animate-pulse mb-5" />
          <div className="h-[120px] rounded-xl bg-secondary animate-pulse" />
        </div>

        {/* Top products */}
        <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
          <div className="h-4 w-36 rounded bg-secondary animate-pulse" />
          {[...Array(4)].map((_, i) => (
            <div key={i} className="space-y-1.5">
              <div className="flex justify-between">
                <div className="h-3 w-32 rounded bg-secondary animate-pulse" />
                <div className="h-3 w-16 rounded bg-secondary animate-pulse" />
              </div>
              <div className="h-1 w-full rounded-full bg-secondary animate-pulse" />
            </div>
          ))}
        </div>

        {/* Expiry alerts + low stock */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 pb-4 lg:pb-6">
          {[...Array(2)].map((_, col) => (
            <div key={col} className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="px-5 py-4 border-b border-border space-y-1.5">
                <div className="h-2.5 w-24 rounded bg-secondary animate-pulse" />
                <div className="h-5 w-56 rounded bg-secondary animate-pulse" />
              </div>
              <div className="divide-y divide-border">
                {[...Array(3)].map((_, row) => (
                  <div key={row} className="flex items-center justify-between px-5 py-3 gap-4">
                    <div className="space-y-1.5 flex-1">
                      <div className="h-3.5 w-28 rounded bg-secondary animate-pulse" />
                      <div className="h-2.5 w-20 rounded bg-secondary animate-pulse" />
                    </div>
                    <div className="h-3.5 w-14 rounded bg-secondary animate-pulse" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
