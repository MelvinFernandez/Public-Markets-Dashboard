"use client";

import { useLastUpdatedStore } from "@/lib/store/lastUpdated";
import { formatUpdatedAt } from "@/lib/utils";

export function LastUpdated() {
  const latest = useLastUpdatedStore((s) => s.latestUpdatedAt());
  return (
    <span className="text-xs text-white/70">Last updated: {formatUpdatedAt(latest)}</span>
  );
}


