"use client";

import { PullToRefresh } from "@/components/pull-to-refresh";
import { ThawGuideInteractive } from "@/components/thaw-guide-interactive";
import type { ThawTarget } from "@/components/thaw-guide";

export function ButcherClient({ thawTargets }: { thawTargets: ThawTarget[] }) {
  return (
    <PullToRefresh>
      <div className="max-w-[900px] mx-auto px-4 sm:px-6 py-4 sm:py-6">
        <ThawGuideInteractive thawTargets={thawTargets} />
      </div>
    </PullToRefresh>
  );
}
