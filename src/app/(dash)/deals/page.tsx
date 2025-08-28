"use client";
import { useState } from "react";
import { format, subMonths } from "date-fns";
import { useDeals } from "@/lib/hooks";
import type { DealItem } from "@/lib/schemas";
import { DataCard } from "@/components/shared/DataCard";
import { Input } from "@/components/ui/input";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export default function DealsPage() {
  const [from, setFrom] = useState(format(subMonths(new Date(), 3), "yyyy-MM-dd"));
  const [to, setTo] = useState(format(new Date(), "yyyy-MM-dd"));
  const { data, isLoading } = useDeals(from, to);
  const rows: DealItem[] = (data as { data?: DealItem[] } | undefined)?.data ?? [];

  const byMonth: Record<string, { date: string; count: number; median: number }> = {};
  for (const d of rows) {
    const key = (d.announcedDate ?? "").slice(0, 7);
    if (!key) continue;
    const cur = byMonth[key] ?? { date: key, count: 0, median: 0 };
    cur.count += 1;
    cur.median = ((cur.median * (cur.count - 1)) + (d.premiumPercent ?? 0)) / cur.count;
    byMonth[key] = cur;
  }
  const trend = Object.values(byMonth).sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="grid lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2">
        <DataCard title="Deals">
          <div className="flex flex-wrap gap-2 mb-3 text-xs text-white/60">
            <div className="flex items-center gap-2"><span>From</span><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-8 bg-black/40 border-white/10 text-white" /></div>
            <div className="flex items-center gap-2"><span>To</span><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-8 bg-black/40 border-white/10 text-white" /></div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-white/60">
                  <th className="text-left py-2">Acquirer</th>
                  <th className="text-left py-2">Target</th>
                  <th className="text-right py-2">Value ($)</th>
                  <th className="text-left py-2">Type</th>
                  <th className="text-right py-2">Premium %</th>
                  <th className="text-left py-2">Sector</th>
                  <th className="text-left py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && (<tr><td className="py-3 text-white/60" colSpan={7}>Loading...</td></tr>)}
                {!isLoading && rows.map((r: DealItem, idx: number) => (
                  <tr key={idx} className="border-t border-white/5">
                    <td className="py-2 text-white">{r.acquirer}</td>
                    <td className="py-2 text-white/80">{r.target}</td>
                    <td className="py-2 text-right text-white/80">{r.valueUSD?.toLocaleString?.() ?? "-"}</td>
                    <td className="py-2 text-white/60">{r.offerType}</td>
                    <td className="py-2 text-right text-white/80">{r.premiumPercent ?? "-"}</td>
                    <td className="py-2 text-white/60">{r.sector}</td>
                    <td className="py-2 text-white/60">{r.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DataCard>
      </div>
      <div className="lg:col-span-1">
        <DataCard title="Monthly Count & Median Premium">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend}>
                <CartesianGrid stroke="#222" />
                <XAxis dataKey="date" stroke="#aaa" />
                <YAxis stroke="#aaa" />
                <Tooltip contentStyle={{ background: "#111", border: "1px solid #333", color: "#fff" }} />
                <Line type="monotone" dataKey="count" stroke="#60a5fa" />
                <Line type="monotone" dataKey="median" stroke="#a78bfa" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </DataCard>
      </div>
    </div>
  );
}


