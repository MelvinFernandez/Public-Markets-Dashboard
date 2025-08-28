"use client";
import { useInsiders } from "@/lib/hooks";
import type { Form4 } from "@/lib/schemas";
import { DataCard } from "@/components/shared/DataCard";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";

export default function InsidersPage() {
  const { data, isLoading } = useInsiders();
  const rows: Form4[] = (data as { data?: Form4[] } | undefined)?.data ?? [];

  const byCompany = Object.values(
    rows.reduce((acc: Record<string, { name: string; buys: number; sells: number }>, r) => {
      const k = r.symbol;
      acc[k] = acc[k] || { name: k, buys: 0, sells: 0 };
      if (r.transactionCode === "P") acc[k].buys += r.shares;
      else acc[k].sells += r.shares;
      return acc;
    }, {})
  );

  const byRole = Object.values(
    rows.reduce((acc: Record<string, { name: string; buys: number; sells: number }>, r) => {
      const k = r.ownerRole || "Other";
      acc[k] = acc[k] || { name: k, buys: 0, sells: 0 };
      if (r.transactionCode === "P") acc[k].buys += r.shares;
      else acc[k].sells += r.shares;
      return acc;
    }, {})
  );

  return (
    <div className="grid lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2">
        <DataCard title="Latest Form 4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-white/60">
                  <th className="text-left py-2">Company</th>
                  <th className="text-left py-2">Owner</th>
                  <th className="text-left py-2">Role</th>
                  <th className="text-left py-2">Type</th>
                  <th className="text-right py-2">Shares</th>
                  <th className="text-right py-2">Price</th>
                  <th className="text-left py-2">Filing</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr><td className="py-3 text-white/60" colSpan={7}>Loading...</td></tr>
                )}
                {!isLoading && rows.map((r, idx: number) => (
                  <tr key={idx} className="border-t border-white/5">
                    <td className="py-2 text-white">{r.symbol}</td>
                    <td className="py-2 text-white/80">{r.ownerName}</td>
                    <td className="py-2 text-white/60">{r.ownerRole}</td>
                    <td className="py-2 text-white/60">{r.transactionCode}</td>
                    <td className="py-2 text-right text-white/80">{r.shares.toLocaleString()}</td>
                    <td className="py-2 text-right text-white/80">{r.price?.toFixed?.(2) ?? "-"}</td>
                    <td className="py-2 text-left"><a className="text-xs underline" href={r.filingUrl} target="_blank">link</a></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DataCard>
      </div>
      <div className="lg:col-span-1 space-y-4">
        <DataCard title="Buys vs Sells by Company">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byCompany as { name: string; buys: number; sells: number }[]}>
                <XAxis dataKey="name" stroke="#aaa" hide />
                <YAxis stroke="#aaa" />
                <Tooltip contentStyle={{ background: "#111", border: "1px solid #333", color: "#fff" }} />
                <Bar dataKey="buys" stackId="a" fill="#34d399" />
                <Bar dataKey="sells" stackId="a" fill="#f43f5e" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </DataCard>
        <DataCard title="Buys vs Sells by Role">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byRole as { name: string; buys: number; sells: number }[]}>
                <XAxis dataKey="name" stroke="#aaa" />
                <YAxis stroke="#aaa" />
                <Tooltip contentStyle={{ background: "#111", border: "1px solid #333", color: "#fff" }} />
                <Bar dataKey="buys" stackId="a" fill="#34d399" />
                <Bar dataKey="sells" stackId="a" fill="#f43f5e" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </DataCard>
      </div>
    </div>
  );
}


