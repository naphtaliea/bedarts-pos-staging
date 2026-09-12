export default function Loading() {
  return (
    <div className="flex flex-col h-screen bg-background">
      <div className="h-14 bg-card border-b border-border shrink-0 flex items-center gap-3 px-4">
        <div className="h-8 w-32 rounded-lg bg-secondary animate-pulse" />
        <div className="flex-1" />
        <div className="h-8 w-20 rounded-lg bg-secondary animate-pulse" />
        <div className="h-8 w-24 rounded-lg bg-secondary animate-pulse" />
        <div className="w-9 h-9 rounded-lg bg-secondary animate-pulse" />
      </div>
      <div className="flex flex-1 min-h-0 p-3 gap-3">
        <div className="w-full lg:w-[40%] rounded-xl bg-secondary animate-pulse" />
        <div className="flex-1 rounded-xl bg-secondary animate-pulse hidden lg:block" />
      </div>
    </div>
  );
}
