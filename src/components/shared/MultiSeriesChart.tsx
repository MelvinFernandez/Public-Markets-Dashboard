"use client";

import { useMemo, useState } from "react";
import { ResponsiveContainer, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Line, Legend } from "recharts";
import { motion } from "framer-motion";

type Series = { symbol: string; points: { ts: number; y: number }[] };

interface Props {
  series: Series[];
  normalize?: boolean;
  range?: "1D" | "1W" | "1M" | "1Y";
}

const COLORS = ["#60a5fa", "#f472b6", "#34d399", "#f59e0b", "#a78bfa", "#f87171"];

const RANGE_MS: Record<NonNullable<Props["range"]>, number> = {
  "1D": 24 * 60 * 60 * 1000,
  "1W": 7 * 24 * 60 * 60 * 1000,
  "1M": 30 * 24 * 60 * 60 * 1000,
  "1Y": 365 * 24 * 60 * 60 * 1000,
};

// simple downsampler so 1Y doesn’t overload the chart
function downsample<T>(arr: T[], target = 500): T[] {
  if (arr.length <= target) return arr;
  const step = Math.ceil(arr.length / target);
  const out: T[] = [];
  for (let i = 0; i < arr.length; i += step) out.push(arr[i]);
  return out;
}

export function MultiSeriesChart({ series, normalize = false, range = "1D" }: Props) {
  const [hidden, setHidden] = useState<Record<string, boolean>>({});

  // 1) filter to the selected time window
  const startTs = Date.now() - RANGE_MS[range];
  const filtered = useMemo(() => {
    return series.map(s => {
      let pts = s.points.filter(p => p.ts >= startTs).sort((a, b) => a.ts - b.ts);
      
      // For daily charts, filter to show data until 4 PM market close
      if (range === "1D") {
        const today = new Date();
        const marketClose = new Date(today);
        marketClose.setHours(16, 0, 0, 0); // 4 PM
        const marketCloseTs = marketClose.getTime();
        
        pts = pts.filter(p => p.ts <= marketCloseTs);
      }
      
      return { symbol: s.symbol, points: downsample(pts) };
    });
  }, [series, startTs, range]);

  // 2) build a wide table for Recharts, with normalization based on the *first visible* point
  const data = useMemo(() => {
    const map = new Map<number, { ts: number; [key: string]: number }>();
    for (const s of filtered) {
      if (s.points.length === 0) continue;
      const base = normalize ? (s.points[0].y || 1) : 1;
      for (const p of s.points) {
        const row = map.get(p.ts) || { ts: p.ts };
        row[s.symbol] = normalize ? (p.y / base) * 100 : p.y;
        map.set(p.ts, row);
      }
    }
    return Array.from(map.values()).sort((a, b) => a.ts - b.ts);
  }, [filtered, normalize]);

  // 3) stable Y domain with better padding
  const yAxisDomain = useMemo(() => {
    const vals: number[] = [];
    for (const row of data) {
      for (const k in row) if (k !== "ts" && typeof row[k] === "number") vals.push(row[k]);
    }
    if (!vals.length) return ["auto", "auto"] as const;
    
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const range = max - min;
    
    // Use percentage-based padding for better scaling
    const padding = range > 0 ? range * 0.1 : Math.max(Math.abs(min) * 0.01, 1); // 10% padding or 1% of value
    
    return [min - padding, max + padding] as const;
  }, [data]);

  const toggle = (sym: string) => setHidden(h => ({ ...h, [sym]: !h[sym] }));
  const formatTick = (ts: number) => {
    const d = new Date(ts);
    if (range === "1D") return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
    if (range === "1Y") return d.toLocaleDateString(undefined, { month: "short" }); // Jan, Feb, …
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.12 }} className="relative h-[280px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart 
          key={`multi-chart-${range}-${data.length}-${series.length}`}
          data={data} 
          margin={{ top: 8, right: 0, bottom: 12, left: 8 }}
        >
          <CartesianGrid stroke="#1a1b1f" strokeOpacity={0.6} />
          {/* numeric time axis so the line reaches the right edge */}
          <XAxis
            dataKey="ts"
            type="number"
            scale="time"
            domain={["dataMin", "dataMax"]}
            tickFormatter={formatTick}
            stroke="#9ca3af"
            tick={{ fontSize: 11 }}
            minTickGap={16}
          />
          <YAxis
            stroke="#9ca3af"
            domain={yAxisDomain}
            tick={{ fontSize: 11 }}
            width={50}
            tickFormatter={(v) => v.toFixed(2)}
          />
          <Tooltip
            contentStyle={{ background: "#0b0b0c", border: "1px solid #333", color: "#fff" }}
            labelFormatter={(v) => new Date(Number(v)).toLocaleString()}
            formatter={(value: number | string, name: string) => [typeof value === "number" ? value.toFixed(2) : value, name]}
          />
          <Legend onClick={(data) => data.value && toggle(data.value)} formatter={(v) => (hidden[v] ? `${v} (hidden)` : v)} />
          {series.map((s, i) =>
            hidden[s.symbol] ? null : (
              <Line
                key={s.symbol}
                type="monotone"
                dataKey={s.symbol}
                stroke={COLORS[i % COLORS.length]}
                strokeWidth={2}
                dot={false}
                connectNulls
                isAnimationActive={false}
              />
            )
          )}
        </LineChart>
      </ResponsiveContainer>
    </motion.div>
  );
}
