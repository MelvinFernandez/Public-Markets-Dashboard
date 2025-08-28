"use client";
import { useQuery } from "@tanstack/react-query";
import { Gavel } from "lucide-react";

type PulseItem = { key: "policy"|"reg"|"trade"|"geopolitics"; label: string; deltaPct: number; value: number; timePeriod?: string };

async function json<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as T;
}

export function PoliticalPulse() {
  const { data, error, isLoading } = useQuery<{ items: PulseItem[]; asOf: string }>({
    queryKey: ["political-pulse"],
    queryFn: async () => {
      const [pulseData, geopoliticsData] = await Promise.all([
        json<{ items: PulseItem[]; asOf: string }>("/api/political-pulse"),
        json<PulseItem>("/api/geopolitics").catch(() => null)
      ]);
      
      let items = pulseData.items;
      
      if (geopoliticsData) {
        // Add geopolitics item - ensure it's properly structured
        const geopoliticsItem: PulseItem = {
          key: "geopolitics",
          label: geopoliticsData.label,
          deltaPct: geopoliticsData.deltaPct,
          value: geopoliticsData.value,
          timePeriod: geopoliticsData.timePeriod
        };
        items = [...items, geopoliticsItem];
      }
      
      return { items, asOf: pulseData.asOf };
    },
    refetchInterval: 60_000 * 30, // 30 min
    staleTime: 60_000 * 10, // 10 min
  });

  if (isLoading) return <div className="h-[220px] flex items-center justify-center text-white/60">Loading…</div>;
  if (error || !data?.items) return <div className="text-white/70">Failed to load Political Pulse.</div>;

  const pill = (d: number) =>
    <span className={`text-xs ${d >= 0 ? "text-green-400" : "text-red-400"}`}>
      {d >= 0 ? `+${d}%` : `${d}%`}
    </span>;

  const pretty = (k: PulseItem["key"]) =>
    k === "policy" ? "Policy Uncertainty" :
    k === "reg" ? "Regulatory Risk" :
    k === "trade" ? "Trade Relations" :
    k === "geopolitics" ? "Geopolitical Risk" : "Unknown";

  return (
    <div className="space-y-2">
      {/* Header with political icon */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Gavel 
            className="h-4 w-4 text-blue-300" 
            style={{ animation: 'heartPulse 30s ease-in-out infinite' }}
            aria-hidden 
          />
          <h3 className="text-sm font-semibold">Political Pulse</h3>
        </div>
        <div className="text-xs text-white/60">Monthly</div>
      </div>
      
      {data.items.map((it, index) => (
        <div key={`${it.key}-${index}`} className="bg-white/5 rounded-xl px-3 py-2 flex items-center justify-between">
          <div>
            <div className="text-xs text-white/60">{pretty(it.key)}</div>
            <div className="text-sm font-semibold">{it.label}</div>
          </div>
          <div className="flex items-baseline gap-2">
            {pill(Math.round(it.deltaPct))}
          </div>
        </div>
      ))}
    </div>
  );
}
