export default function ReceiptLoading() {
  return (
    <div className="flex flex-col h-dvh bg-white overflow-hidden">
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

      <div className="flex flex-1 min-h-0">
        {/* Left — action panel (w-2/5) */}
        <aside className="w-2/5 border-r border-border flex flex-col bg-white shrink-0">
          {/* Success banner */}
          <div className="border-b border-border px-6 py-8 text-center flex flex-col items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-slate-100 animate-pulse" />
            <div className="space-y-2">
              <div className="h-5 w-36 rounded bg-slate-100 animate-pulse mx-auto" />
              <div className="h-3 w-20 rounded bg-slate-100 animate-pulse mx-auto" />
            </div>
          </div>
          {/* Payment summary */}
          <div className="px-5 py-4 border-b border-border space-y-3">
            <div className="flex justify-between items-baseline">
              <div className="h-4 w-10 rounded bg-slate-100 animate-pulse" />
              <div className="h-7 w-24 rounded bg-slate-100 animate-pulse" />
            </div>
            <div className="flex justify-between">
              <div className="h-3.5 w-24 rounded bg-slate-100 animate-pulse" />
              <div className="h-3.5 w-16 rounded bg-slate-100 animate-pulse" />
            </div>
          </div>
          {/* Action buttons */}
          <div className="flex-1 flex flex-col gap-2 p-5">
            <div className="h-12 rounded-xl bg-slate-200 animate-pulse" />
            <div className="h-12 rounded-xl bg-slate-100 animate-pulse" />
            <div className="h-12 rounded-xl bg-slate-100 animate-pulse" />
          </div>
        </aside>

        {/* Right — receipt paper */}
        <main className="flex-1 flex justify-center px-6 py-8 bg-secondary/50">
          <div className="w-full max-w-sm">
            <div className="bg-white rounded-xl shadow-lg border border-black/5 overflow-hidden">
              {/* Logo */}
              <div className="pt-4 pb-2 flex justify-center px-6">
                <div className="h-10 w-32 rounded bg-slate-100 animate-pulse" />
              </div>
              <div className="border-t border-dashed border-border/50 mx-5 my-2" />
              {/* Store info */}
              <div className="px-6 py-2 text-center space-y-2">
                <div className="h-3 w-48 rounded bg-slate-100 animate-pulse mx-auto" />
                <div className="h-3 w-32 rounded bg-slate-100 animate-pulse mx-auto" />
              </div>
              <div className="border-t border-dashed border-border/50 mx-5 my-2" />
              {/* Meta */}
              <div className="px-6 py-2 space-y-2">
                {[100, 80, 96].map((w, i) => (
                  <div key={i} className="flex justify-between gap-4">
                    <div className="h-3 w-14 rounded bg-slate-100 animate-pulse" />
                    <div className="h-3 rounded bg-slate-100 animate-pulse" style={{ width: w / 2 }} />
                  </div>
                ))}
              </div>
              <div className="border-t border-dashed border-border/50 mx-5 my-2" />
              {/* Items */}
              <div className="px-6 py-2 space-y-3">
                {[1, 2].map((i) => (
                  <div key={i}>
                    <div className="flex justify-between gap-3">
                      <div className="h-4 w-28 rounded bg-slate-200 animate-pulse" />
                      <div className="h-4 w-14 rounded bg-slate-200 animate-pulse" />
                    </div>
                    <div className="h-3 w-24 rounded bg-slate-100 animate-pulse mt-1 ml-2" />
                  </div>
                ))}
              </div>
              <div className="border-t border-dashed border-border/50 mx-5 my-2" />
              {/* Total */}
              <div className="px-6 py-3 flex justify-between items-baseline">
                <div className="h-5 w-16 rounded bg-slate-200 animate-pulse" />
                <div className="h-6 w-24 rounded bg-slate-200 animate-pulse" />
              </div>
              <div className="border-t border-dashed border-border/50 mx-5 my-2" />
              <div className="px-6 pb-4 py-2">
                <div className="h-3 w-48 rounded bg-slate-100 animate-pulse mx-auto" />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
