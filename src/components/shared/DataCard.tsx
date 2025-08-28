"use client";

import { cn } from "@/lib/utils";
import { LivePulse } from "./LiveIndicator";

interface DataCardProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
  isLive?: boolean;
  isRefetching?: boolean;
}

export function DataCard({ title, children, className, isLive, isRefetching }: DataCardProps) {
  return (
    <div className={cn("bg-white/5 border border-white/10 rounded-lg p-4", className)}>
      {title && (
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-white/90">{title}</h3>
          {isLive && (
            <div className="flex items-center gap-2">
              {isRefetching && <LivePulse />}
              <div className="w-2 h-2 rounded-full bg-green-400 opacity-60" />
            </div>
          )}
        </div>
      )}
      {children}
    </div>
  );
}
