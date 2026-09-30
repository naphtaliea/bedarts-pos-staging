"use client";

import { PullToRefresh } from "@/components/pull-to-refresh";
import { ThawGuide, type ThawTarget } from "@/components/thaw-guide";

// Butcher's entire dashboard. Just the thaw guide, wrapped in pull-to-refresh
// so a downward drag from the top pulls the latest sold-today numbers.
export function ButcherClient({
  thawTargets,
}: {
  thawTargets: ThawTarget[];
}) {
  return (
    <PullToRefresh>
      <div className="max-w-[900px] mx-auto px-4 sm:px-6 py-4 sm:py-6">
        <ThawGuide thawTargets={thawTargets} />
      </div>
    </PullToRefresh>
  );
}
