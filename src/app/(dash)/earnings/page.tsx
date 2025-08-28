"use client";
import { useState } from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { DataCard } from "@/components/shared/DataCard";
import { TickerSearch } from "@/components/shared/TickerSearch";
import { useEarningsCalendar, useEps } from "@/lib/hooks";
import { format } from "date-fns";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, BarChart, Bar, CartesianGrid } from "recharts";
import type { EarningsCalendarItem, EpsSurprise } from "@/lib/schemas";

export default function EarningsPage() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [ticker, setTicker] = useState<string>("AAPL");

  const from = selectedDate ? format(selectedDate, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd");
  const to = selectedDate ? format(selectedDate, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd");

  const cal = useEarningsCalendar(from, to);
  const eps = useEps(ticker);

  const epsData = ((eps.data as { data?: EpsSurprise[] } | undefined)?.data ?? ([] as EpsSurprise[])).map((r) => ({ period: r.period, estimate: r.estimate ?? 0, actual: r.actual ?? 0, surprise: r.surprise ?? 0 }));
  const calData: EarningsCalendarItem[] = (cal.data as { data?: EarningsCalendarItem[] } | undefined)?.data ?? [];

  return (
    <div className="grid lg:grid-cols-3 gap-4">
      <div className="lg:col-span-1 space-y-4">
        <DataCard title="Earnings Calendar">
          <DayPicker mode="single" selected={selectedDate} onSelect={setSelectedDate} className="bg-transparent text-white" />
          <div className="mt-3 text-xs text-white/70">
            {cal.isLoading && "Loading..."}
            {!cal.isLoading && calData.length === 0 && "No earnings on this date."}
            {!cal.isLoading && calData.length > 0 && (
              <ul className="space-y-1">
                {calData.map((e, idx: number) => (
                  <li key={idx} className="flex items-center justify-between">
                    <span className="text-white">{e.symbol}</span>
                    <span className="text-white/60 text-xs">{e.time?.toUpperCase() ?? "DMH"}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </DataCard>

        <DataCard title="Find Ticker">
          <TickerSearch onSelect={setTicker} />
          <div className="mt-2 text-xs text-white/60">Current: {ticker}</div>
        </DataCard>
      </div>

      <div className="lg:col-span-2 space-y-4">
        <DataCard title="EPS Estimate vs Actual">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={epsData} margin={{ top: 10, left: 10, right: 10 }}>
                <CartesianGrid stroke="#222" />
                <XAxis dataKey="period" stroke="#aaa" angle={-20} height={50} textAnchor="end" />
                <YAxis stroke="#aaa" />
                <Tooltip contentStyle={{ background: "#111", border: "1px solid #333", color: "#fff" }} />
                <Line type="monotone" dataKey="estimate" stroke="#60a5fa" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="actual" stroke="#34d399" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </DataCard>

        <DataCard title="Beat / Miss">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={epsData}>
                <CartesianGrid stroke="#222" />
                <XAxis dataKey="period" stroke="#aaa" angle={-20} height={50} textAnchor="end" />
                <YAxis stroke="#aaa" />
                <Tooltip contentStyle={{ background: "#111", border: "1px solid #333", color: "#fff" }} />
                <Bar dataKey="surprise" fill="#a78bfa" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </DataCard>
      </div>
    </div>
  );
}


