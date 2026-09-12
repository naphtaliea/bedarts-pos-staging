export default function Loading() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div className="h-14 bg-card border-b border-border shrink-0 flex items-center gap-3 px-4">
        <div className="w-9 h-9 rounded-lg bg-secondary animate-pulse" />
        <div className="h-8 w-32 rounded-lg bg-secondary animate-pulse" />
        <div className="flex-1" />
        <div className="h-8 w-20 rounded-lg bg-secondary animate-pulse" />
        <div className="h-8 w-24 rounded-lg bg-secondary animate-pulse" />
        <div className="w-9 h-9 rounded-lg bg-secondary animate-pulse" />
      </div>
      <div className="flex-1 p-4 lg:p-6 space-y-4 max-w-5xl mx-auto w-full">
        <div className="flex justify-between">
          <div className="h-7 w-40 rounded-lg bg-secondary animate-pulse" />
          <div className="h-9 w-40 rounded-lg bg-secondary animate-pulse" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="h-24 rounded-xl bg-secondary animate-pulse" />
          <div className="h-24 rounded-xl bg-secondary animate-pulse" />
        </div>
        <div className="h-64 rounded-xl bg-secondary animate-pulse" />
      </div>
    </div>
  );
}
