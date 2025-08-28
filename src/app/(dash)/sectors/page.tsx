"use client";
import { useSectors } from "@/lib/hooks";
import { DataCard } from "@/components/shared/DataCard";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";
import type { SectorPrice } from "@/lib/schemas";

const SECTORS = ["XLK","XLF","XLY","XLE","XLV","XLI","XLU","XLB","XLRE","XLC"];

function computeReturns(series: SectorPrice[]) {
  const by = series.reduce((acc: Record<string, SectorPrice[]>, r: SectorPrice) => {
    acc[r.symbol] = acc[r.symbol] || [];
    acc[r.symbol].push(r);
    return acc;
  }, {} as Record<string, SectorPrice[]>);

  const windows = [5, 21, 63];
  const matrix = SECTORS.map((s) => {
    const arr = (by[s] ?? []).map((r) => r.close);
    const last = arr[arr.length - 1];
    const row: Record<string, number | string> = { symbol: s };
    windows.forEach((w) => {
      const prev = arr[arr.length - 1 - w] ?? last;
      row[`${w}`] = ((last - prev) / prev) * 100;
    });
    row["momentum"] = windows.reduce((a, w) => a + Number(row[`${w}`] ?? 0), 0);
    return row;
  });
  return matrix;
}

export default function SectorsPage() {
  const { data } = useSectors();
  const rows: SectorPrice[] = (data as { data?: SectorPrice[] } | undefined)?.data ?? [];
  const matrix = computeReturns(rows);

  const momentumSeries = matrix.map((r) => ({ symbol: r.symbol as string, score: r.momentum as number }));

  return (
    <div className="grid lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2">
        <DataCard title="Relative Performance Heat Map (5d / 1m / 3m)">
          <div className="grid grid-cols-5 gap-2 text-xs">
            <div className="text-white/60">Sector</div>
            <div className="text-center text-white/60">5d</div>
            <div className="text-center text-white/60">1m</div>
            <div className="text-center text-white/60">3m</div>
            <div className="text-center text-white/60">Momentum</div>
            {matrix.map((r) => (
              <div key={r.symbol} className="contents">
                <div className="text-white">{r.symbol}</div>
                {["5","21","63","momentum"].map((k) => {
                  const vRaw = r[k] ?? 0;
                  const vNum = typeof vRaw === "number" ? vRaw : Number(vRaw);
                  const bg = vNum >= 0 ? `rgba(34,197,94,${Math.min(0.9, Math.abs(vNum)/20)})` : `rgba(244,63,94,${Math.min(0.9, Math.abs(vNum)/20)})`;
                  return <div key={`${r.symbol}-${k}`} className="rounded text-center text-white" style={{ background: bg }}>{vNum.toFixed(1)}</div>;
                })}
              </div>
            ))}
          </div>
        </DataCard>
      </div>
      <div className="lg:col-span-1">
        <DataCard title="Momentum Score">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={momentumSeries as { symbol: string; score: number }[]}>
                <XAxis dataKey="symbol" stroke="#aaa" />
                <YAxis stroke="#aaa" />
                <Tooltip contentStyle={{ background: "#111", border: "1px solid #333", color: "#fff" }} />
                <Bar dataKey="score" fill="#60a5fa" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </DataCard>
      </div>
    </div>
  );
}


