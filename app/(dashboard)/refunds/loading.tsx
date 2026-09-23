export default function RefundsLoading() {
  return (
    <div className="flex flex-col h-full">
      {/* Banner */}
      <div className="bg-white border-b border-border shrink-0">
        <div className="border-b border-border px-4 lg:px-6 py-3 lg:py-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-1 self-stretch rounded-full bg-secondary animate-pulse shrink-0" />
            <div className="space-y-1.5">
              <div className="h-4 w-24 rounded bg-secondary animate-pulse" />
              <div className="h-2.5 w-48 rounded bg-secondary animate-pulse" />
            </div>
          </div>
          {/* Filter pills */}
          <div className="flex gap-1">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-8 w-20 rounded-lg bg-secondary animate-pulse" />
            ))}
          </div>
        </div>
      </div>

      {/* Sales list */}
      <div className="flex-1 overflow-auto p-4 lg:p-6 space-y-3">
        {[...Array(7)].map((_, i) => (
          <div key={i} className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="flex items-start justify-between gap-4 px-5 py-4">
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2">
                  <div className="h-3.5 w-28 rounded bg-secondary animate-pulse" />
                  <div className="h-5 w-16 rounded-full bg-secondary animate-pulse" />
                </div>
                <div className="h-3 w-36 rounded bg-secondary animate-pulse" />
                <div className="h-3 w-24 rounded bg-secondary animate-pulse" />
              </div>
              <div className="text-right space-y-2 shrink-0">
                <div className="h-5 w-20 rounded bg-secondary animate-pulse ml-auto" />
                <div className="h-8 w-20 rounded-lg bg-secondary animate-pulse" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
