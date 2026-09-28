export default function SettingsLoading() {
  return (
    <div className="flex flex-col h-full">
      {/* Banner */}
      <div className="bg-white border-b border-border shrink-0">
        <div className="border-b border-border px-4 lg:px-6 py-3 lg:py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-1 self-stretch rounded-full bg-secondary animate-pulse shrink-0" />
            <div className="space-y-1.5">
              <div className="h-2.5 w-16 rounded bg-secondary animate-pulse" />
              <div className="h-5 w-24 rounded bg-secondary animate-pulse" />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile: horizontal tab strip */}
      <div className="lg:hidden shrink-0 bg-card border-b border-border overflow-x-auto no-scrollbar">
        <div className="flex items-center px-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-12 w-20 shrink-0 mx-1 flex items-center justify-center">
              <div className="h-3 w-14 rounded bg-secondary animate-pulse" />
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop: sidebar nav */}
        <nav className="hidden lg:flex w-48 shrink-0 border-r border-border bg-card flex-col py-4 gap-0.5 px-2">
          {[...Array(9)].map((_, i) => (
            <div key={i} className="h-9 w-full rounded-lg px-3 flex items-center">
              <div className="h-3 w-24 rounded bg-secondary animate-pulse" />
            </div>
          ))}
        </nav>

        {/* Content pane */}
        <div className="flex-1 overflow-auto p-6 space-y-6">
          {/* Section header */}
          <div className="h-5 w-36 rounded bg-secondary animate-pulse" />

          {/* Form fields */}
          <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-1.5">
                <div className="h-3 w-24 rounded bg-secondary animate-pulse" />
                <div className="h-10 w-full rounded-lg bg-secondary animate-pulse" />
              </div>
            ))}
            <div className="pt-2">
              <div className="h-10 w-28 rounded-xl bg-secondary animate-pulse" />
            </div>
          </div>

          {/* Second section */}
          <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
            <div className="h-4 w-28 rounded bg-secondary animate-pulse" />
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center justify-between gap-4 py-1">
                <div className="space-y-1.5 flex-1">
                  <div className="h-3.5 w-32 rounded bg-secondary animate-pulse" />
                  <div className="h-2.5 w-48 rounded bg-secondary animate-pulse" />
                </div>
                <div className="h-9 w-9 rounded-lg bg-secondary animate-pulse shrink-0" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
