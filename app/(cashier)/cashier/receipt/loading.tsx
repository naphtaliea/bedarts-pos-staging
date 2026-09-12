export default function Loading() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-start py-10 px-4">
      <div className="w-full max-w-md mb-4">
        <div className="h-5 w-28 rounded bg-secondary animate-pulse" />
      </div>
      <div className="w-full max-w-md bg-card rounded-2xl border border-border overflow-hidden">
        <div className="h-24 bg-primary/30 animate-pulse" />
        <div className="px-6 py-5 space-y-4">
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-4 rounded bg-secondary animate-pulse" style={{ width: `${60 + i * 10}%` }} />
            ))}
          </div>
          <div className="h-px bg-border" />
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-4 rounded bg-secondary animate-pulse" />
            ))}
          </div>
          <div className="h-px bg-border" />
          <div className="h-4 w-1/2 rounded bg-secondary animate-pulse" />
        </div>
      </div>
      <div className="flex flex-col gap-3 mt-6 w-full max-w-md">
        <div className="h-12 rounded-xl bg-secondary animate-pulse" />
        <div className="flex gap-3">
          <div className="flex-1 h-12 rounded-xl bg-secondary animate-pulse" />
          <div className="flex-1 h-12 rounded-xl bg-secondary animate-pulse" />
        </div>
      </div>
    </div>
  );
}
