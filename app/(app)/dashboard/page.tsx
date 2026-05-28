"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { formatIDR } from "@/lib/currency";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

export default function DashboardPage() {
  const period = format(new Date(), "yyyy-MM");
  const summary = useQuery(api.expenses.getExpenseSummary, { period });

  const monthName = format(new Date(), "MMMM yyyy", { locale: idLocale });

  return (
    <div className="p-4 max-w-lg mx-auto space-y-4">
      <div className="pt-4">
        <h1 className="text-xl font-semibold text-zinc-50">Dashboard</h1>
        <p className="text-zinc-400 text-sm">{monthName}</p>
      </div>

      {/* Total card */}
      <div className="bg-zinc-900 rounded-2xl p-5 border border-zinc-800">
        <p className="text-zinc-400 text-sm">Total Pengeluaran</p>
        {summary === undefined ? (
          <Skeleton className="h-9 w-48 mt-1 bg-zinc-800" />
        ) : (
          <p className="text-3xl font-bold text-zinc-50 mt-1">
            {formatIDR(summary.total)}
          </p>
        )}
        <p className="text-zinc-500 text-xs mt-1">
          {summary?.count ?? "–"} transaksi
        </p>
      </div>

      {/* By category */}
      {summary && summary.byCategory.length > 0 && (
        <div className="bg-zinc-900 rounded-2xl p-4 border border-zinc-800">
          <p className="text-zinc-400 text-sm mb-3">Per Kategori</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={summary.byCategory} layout="vertical" margin={{ left: 8, right: 16 }}>
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="name"
                width={80}
                tick={{ fill: "#a1a1aa", fontSize: 11 }}
              />
              <Tooltip
                cursor={{ fill: "rgba(255,255,255,0.06)" }}
                formatter={(value) => [formatIDR(Number(value)), "Total"]}
                contentStyle={{
                  background: "#fafafa",
                  border: "none",
                  borderRadius: 10,
                  boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
                  padding: "8px 12px",
                }}
                labelStyle={{ color: "#18181b", fontWeight: 600, fontSize: 13 }}
                itemStyle={{ color: "#3f3f46", fontSize: 12 }}
              />
              <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                {summary.byCategory.map((entry, index) => (
                  <Cell key={index} fill={entry.color ?? "#3b82f6"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {summary?.byCategory.length === 0 && (
        <div className="text-center py-12 text-zinc-500">
          <p>Belum ada pengeluaran bulan ini.</p>
          <p className="text-sm mt-1">Tap + untuk menambah.</p>
        </div>
      )}
    </div>
  );
}
