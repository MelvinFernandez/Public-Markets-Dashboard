"use client";

import { useState, useEffect } from "react";
import { renderNarrative } from "@/lib/marketNarrative/render";

function formatAsET(iso: string) {
  const d = new Date(iso);
  // "10:42 PM EDT" → we replace the zone with "ET"
  const s = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "America/New_York",
    timeZoneName: "short",
  }).format(d);
  const [time] = s.split(" ");
  return `${time} ET`;
}

interface NewsItem {
  title: string;
  source: string;
  time: string;
  tags: string[];
}

interface PolicyContext {
  label: string;
  tradeLabel: string;
  tradeDelta: number;
}

interface BigPictureData {
  asOf: string;
  tickers: Record<string, { last: number; prev: number; pct: number }>;
  sectors: Record<string, number>;
  sectorBreadth: { count: number; percentage: number; total: number };
  factors: {
    mega_vs_equal: number;
    small_vs_spx: number;
    creditTone: number;
    dollarMove: number;
    vixMove: number;
  };
  headlines: NewsItem[];
  policy: PolicyContext;
  paragraphs: string[];
  text: string;
}

interface BigPictureCardProps {
  className?: string;
}

export function BigPictureCard({ className = "" }: BigPictureCardProps) {
  const [data, setData] = useState<BigPictureData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBigPicture = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch('/api/big-picture');
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        setData(result);
      } catch (err) {
        console.error("Big picture fetch error:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchBigPicture();
  }, []);

  if (loading) {
    return (
      <div className={`p-4 ${className}`}>
        <div className="animate-pulse">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-4 bg-white/10 rounded w-32"></div>
            <div className="text-xs text-white/60">Generating market overview...</div>
          </div>
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-2">
                <div className="h-3 bg-white/5 rounded w-full"></div>
                <div className="h-3 bg-white/5 rounded w-3/4"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className={`p-4 text-center ${className}`}>
        <div className="text-red-400 text-sm">
          {error || "Failed to load big picture data"}
        </div>
      </div>
    );
  }

  return (
    <div className={`${className} -mx-4 -my-4 px-4 pt-2 pb-4`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <h3 className="text-sm font-medium text-white">Big Picture</h3>
        </div>
        <div className="text-xs text-white/60">
          As of {formatAsET(data.asOf)}
        </div>
      </div>

      {/* Market Intelligence Content with Inline Pills */}
      <div className="text-[13px] md:text-sm leading-6 text-white/85 space-y-3">
        {renderNarrative(data.text ?? data.paragraphs)}
      </div>
    </div>
  );
}
