// Skeleton mirrors the real dashboard layout so the transition to loaded
// content doesn't jump. Keep this file in sync with dashboard-client.tsx.

export default function DashboardLoading() {
  return (
    <div className="min-h-full bg-slate-50">
      {/* Page header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-3">
          <div className="space-y-2">
            <div className="h-2.5 w-16 rounded bg-slate-200 animate-pulse" />
            <div className="h-6 sm:h-7 w-32 rounded bg-slate-200 animate-pulse" />
          </div>
          <div className="h-11 w-40 rounded-lg bg-slate-200 animate-pulse" />
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">

        {/* Hero: revenue + net profit */}
        <div className="rounded-2xl bg-white border border-slate-200 p-5 sm:p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 h-full w-1 bg-slate-200" />
          <div className="grid grid-cols-1 sm:grid-cols-[3fr_2fr] gap-5 sm:gap-6 items-start pl-2">
            <div className="space-y-3">
              <div className="h-3 w-24 rounded bg-slate-200 animate-pulse" />
              <div className="h-10 sm:h-12 w-40 sm:w-56 rounded bg-slate-200 animate-pulse" />
              <div className="h-3 w-32 rounded bg-slate-200 animate-pulse" />
            </div>
            <div className="border-t sm:border-t-0 sm:border-l border-slate-200 pt-4 sm:pt-0 sm:pl-6 space-y-3">
              <div className="h-3 w-24 rounded bg-slate-200 animate-pulse" />
              <div className="h-8 sm:h-10 w-32 sm:w-40 rounded bg-slate-200 animate-pulse" />
              <div className="h-3 w-24 rounded bg-slate-200 animate-pulse" />
            </div>
          </div>
        </div>

        {/* 4 metric cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl bg-white border border-slate-200 p-4 sm:p-5 space-y-3">
              <div className="w-8 h-8 rounded-lg bg-slate-200 animate-pulse" />
              <div className="h-3 w-16 rounded bg-slate-200 animate-pulse" />
              <div className="h-6 sm:h-7 w-24 rounded bg-slate-200 animate-pulse" />
              <div className="h-2.5 w-20 rounded bg-slate-200 animate-pulse" />
            </div>
          ))}
        </div>

        {/* Revenue trend + Category mix */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="lg:col-span-2 rounded-2xl bg-white border border-slate-200 p-4 sm:p-5">
            <div className="flex items-start justify-between mb-5">
              <div className="space-y-2">
                <div className="h-3 w-24 rounded bg-slate-200 animate-pulse" />
                <div className="h-5 w-28 rounded bg-slate-200 animate-pulse" />
              </div>
              <div className="space-y-2 items-end flex flex-col">
                <div className="h-5 w-20 rounded bg-slate-200 animate-pulse" />
                <div className="h-2.5 w-10 rounded bg-slate-200 animate-pulse" />
              </div>
            </div>
            <div className="h-[200px] rounded-lg bg-slate-100 animate-pulse" />
          </div>

          <div className="rounded-2xl bg-white border border-slate-200 p-4 sm:p-5">
            <div className="space-y-2 mb-4">
              <div className="h-3 w-24 rounded bg-slate-200 animate-pulse" />
              <div className="h-5 w-24 rounded bg-slate-200 animate-pulse" />
            </div>
            <div className="h-[160px] w-[144px] rounded-full mx-auto bg-slate-100 animate-pulse" />
            <div className="space-y-2 mt-4">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-slate-200 animate-pulse shrink-0" />
                  <div className="h-3 flex-1 rounded bg-slate-200 animate-pulse" />
                  <div className="h-3 w-8 rounded bg-slate-200 animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* P&L panel */}
        <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden">
          <div className="px-4 sm:px-5 py-4 border-b border-slate-200 space-y-2">
            <div className="h-3 w-24 rounded bg-slate-200 animate-pulse" />
            <div className="h-5 w-28 rounded bg-slate-200 animate-pulse" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
            <div className="lg:col-span-2 p-4 sm:p-5 space-y-3">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="flex justify-between">
                  <div className="h-4 w-32 rounded bg-slate-200 animate-pulse" />
                  <div className="h-4 w-20 rounded bg-slate-200 animate-pulse" />
                </div>
              ))}
              <div className="pt-3 border-t border-slate-200 flex justify-between">
                <div className="h-5 w-28 rounded bg-slate-200 animate-pulse" />
                <div className="h-8 w-32 rounded bg-slate-200 animate-pulse" />
              </div>
            </div>
            <div className="p-4 sm:p-5 space-y-3">
              <div className="h-3 w-32 rounded bg-slate-200 animate-pulse mb-2" />
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="space-y-1.5">
                  <div className="flex justify-between">
                    <div className="h-3 w-20 rounded bg-slate-200 animate-pulse" />
                    <div className="h-3 w-12 rounded bg-slate-200 animate-pulse" />
                  </div>
                  <div className="h-1 w-full rounded-full bg-slate-100 animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Peak hours + Top products */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="lg:col-span-2 rounded-2xl bg-white border border-slate-200 p-4 sm:p-5">
            <div className="space-y-2 mb-4">
              <div className="h-3 w-24 rounded bg-slate-200 animate-pulse" />
              <div className="h-5 w-56 rounded bg-slate-200 animate-pulse" />
            </div>
            <div className="h-[140px] rounded-lg bg-slate-100 animate-pulse" />
          </div>

          <div className="rounded-2xl bg-white border border-slate-200 p-4 sm:p-5 space-y-3">
            <div className="space-y-2">
              <div className="h-3 w-24 rounded bg-slate-200 animate-pulse" />
              <div className="h-5 w-36 rounded bg-slate-200 animate-pulse mb-2" />
            </div>
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-1.5">
                <div className="flex justify-between">
                  <div className="h-3 w-28 rounded bg-slate-200 animate-pulse" />
                  <div className="h-3 w-16 rounded bg-slate-200 animate-pulse" />
                </div>
                <div className="h-1.5 w-full rounded-full bg-slate-100 animate-pulse" />
              </div>
            ))}
          </div>
        </div>

        {/* Low stock */}
        <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden">
          <div className="px-4 sm:px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-3 w-24 rounded bg-slate-200 animate-pulse" />
              <div className="h-5 w-56 rounded bg-slate-200 animate-pulse" />
            </div>
            <div className="h-9 w-24 rounded-md bg-slate-200 animate-pulse" />
          </div>
          <div className="divide-y divide-slate-100">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="px-4 sm:px-5 py-3 space-y-2">
                <div className="flex justify-between">
                  <div className="h-4 w-40 rounded bg-slate-200 animate-pulse" />
                  <div className="h-3 w-20 rounded bg-slate-200 animate-pulse" />
                </div>
                <div className="h-1.5 w-full rounded-full bg-slate-100 animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
