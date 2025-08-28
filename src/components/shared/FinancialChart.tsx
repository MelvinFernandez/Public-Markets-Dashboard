"use client";

import { useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface FinancialChartProps {
  data: { timestamp: number; close: number }[]; // timestamp in ms
  height?: number;
  range?: "1D" | "1W" | "1M" | "1Y";
}

const RANGE_MS = {
  "1D": 24 * 60 * 60 * 1000,
  "1W": 7 * 24 * 60 * 60 * 1000,
  "1M": 30 * 24 * 60 * 60 * 1000,
  "1Y": 365 * 24 * 60 * 60 * 1000,
} as const;

export function FinancialChart({ data, height = 280, range = "1D" }: FinancialChartProps) {
  // 1) filter to the selected window
  const startTs = Date.now() - RANGE_MS[range];
  const chartData = useMemo(() => {
    let filtered = data.filter(d => d.timestamp >= startTs).sort((a, b) => a.timestamp - b.timestamp);
    
    // For daily charts, filter to show data until 4 PM market close
    if (range === "1D") {
      const today = new Date();
      const marketClose = new Date(today);
      marketClose.setHours(16, 0, 0, 0); // 4 PM
      const marketCloseTs = marketClose.getTime();
      
      filtered = filtered.filter(d => d.timestamp <= marketCloseTs);
    }
    
    // keep numeric ts so XAxis is time/linear (not categorical)
    return filtered.map(d => ({ ts: d.timestamp, price: Number(d.close.toFixed(2)) }));
  }, [data, startTs, range]);

  // 2) stable y domain with better padding
  const yAxisDomain = useMemo(() => {
    if (!chartData.length) return ["auto", "auto"] as const;
    const prices = chartData.map(d => d.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    
    // Use percentage-based padding for better scaling
    const range = max - min;
    const padding = range > 0 ? range * 0.1 : Math.max(min * 0.01, 1); // 10% padding or 1% of value
    
    return [min - padding, max + padding] as const;
  }, [chartData]);

  const tickFmt = (ts: number) => {
    const d = new Date(ts);
    if (range === "1D") return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
    if (range === "1Y") return d.toLocaleDateString(undefined, { month: "short" });
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  return (
    <div className="relative" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart 
          key={`financial-chart-${range}-${chartData.length}`}
          data={chartData} 
          margin={{ top: 8, right: 0, bottom: 12, left: 8 }}
        >
          <CartesianGrid stroke="#1a1b1f" strokeOpacity={0.6} />
          <XAxis
            dataKey="ts"
            type="number"
            scale="time"
            domain={["dataMin", "dataMax"]}
            tickFormatter={tickFmt}
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
            formatter={(value: number | string) => [typeof value === "number" ? value.toFixed(2) : value, "Price"]}
          />
          <Line type="monotone" dataKey="price" stroke="#60a5fa" strokeWidth={2} dot={false} connectNulls isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
