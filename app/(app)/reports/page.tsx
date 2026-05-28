"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { formatIDR } from "@/lib/currency";
import { Skeleton } from "@/components/ui/skeleton";
import { format, subMonths, addMonths } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

const COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
  "#06b6d4", "#ec4899", "#84cc16", "#f97316", "#6366f1",
];

function useLast6Months(endDate: Date) {
  const periods = Array.from({ length: 6 }, (_, i) =>
    format(subMonths(endDate, 5 - i), "yyyy-MM")
  );
  const q0 = useQuery(api.expenses.getExpenseSummary, { period: periods[0] });
  const q1 = useQuery(api.expenses.getExpenseSummary, { period: periods[1] });
  const q2 = useQuery(api.expenses.getExpenseSummary, { period: periods[2] });
  const q3 = useQuery(api.expenses.getExpenseSummary, { period: periods[3] });
  const q4 = useQuery(api.expenses.getExpenseSummary, { period: periods[4] });
  const q5 = useQuery(api.expenses.getExpenseSummary, { period: periods[5] });

  return [q0, q1, q2, q3, q4, q5].map((q, i) => ({
    period: periods[i],
    label: format(subMonths(endDate, 5 - i), "MMM", { locale: idLocale }),
    total: q?.total ?? 0,
    loading: q === undefined,
  }));
}

export default function ReportsPage() {
  const [current, setCurrent] = useState(new Date());
  const period = format(current, "yyyy-MM");
  const summary = useQuery(api.expenses.getExpenseSummary, { period });
  const trend = useLast6Months(current);

  const monthName = format(current, "MMMM yyyy", { locale: idLocale });
  const isLoading = summary === undefined;

  return (
    <div className="p-4 max-w-lg mx-auto space-y-4 pb-6">
      <div className="pt-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-zinc-50">Laporan</h1>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCurrent((d) => subMonths(d, 1))}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm text-zinc-300 min-w-[110px] text-center">{monthName}</span>
          <button
            onClick={() => setCurrent((d) => addMonths(d, 1))}
            disabled={period >= format(new Date(), "yyyy-MM")}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors disabled:opacity-30"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Total */}
      <div className="bg-zinc-900 rounded-2xl p-5 border border-zinc-800">
        <p className="text-zinc-400 text-sm">Total Pengeluaran</p>
        {isLoading ? (
          <Skeleton className="h-9 w-48 mt-1 bg-zinc-800" />
        ) : (
          <p className="text-3xl font-bold text-zinc-50 mt-1">{formatIDR(summary.total)}</p>
        )}
        {isLoading ? (
          <Skeleton className="h-4 w-24 mt-1 bg-zinc-800" />
        ) : (
          <p className="text-zinc-500 text-sm mt-1">{summary.count} transaksi</p>
        )}
      </div>

      {/* 6-month trend */}
      <div className="bg-zinc-900 rounded-2xl p-4 border border-zinc-800">
        <p className="text-xs font-medium text-zinc-500 uppercase tracking-widest mb-4">Tren 6 Bulan</p>
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={trend} barSize={28}>
            <XAxis dataKey="label" tick={{ fill: "#71717a", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis hide />
            <Tooltip
              cursor={{ fill: "#ffffff08" }}
              content={({ active, payload }) =>
                active && payload?.[0] ? (
                  <div className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-zinc-200">
                    {formatIDR(payload[0].value as number)}
                  </div>
                ) : null
              }
            />
            <Bar dataKey="total" radius={[6, 6, 0, 0]}>
              {trend.map((entry, i) => (
                <Cell
                  key={i}
                  fill={entry.period === period ? "#3b82f6" : "#3f3f46"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Category breakdown */}
      <div className="bg-zinc-900 rounded-2xl p-4 border border-zinc-800">
        <p className="text-xs font-medium text-zinc-500 uppercase tracking-widest mb-4">Per Kategori</p>
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-8 rounded-lg bg-zinc-800" />)}
          </div>
        ) : summary.byCategory.length === 0 ? (
          <p className="text-zinc-600 text-sm text-center py-4">Tidak ada data</p>
        ) : (
          <div className="space-y-3">
            {[...summary.byCategory]
              .sort((a, b) => b.total - a.total)
              .map((cat, i) => {
                const pct = summary.total > 0 ? (cat.total / summary.total) * 100 : 0;
                const color = cat.color ?? COLORS[i % COLORS.length];
                return (
                  <div key={cat.categoryId}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-zinc-300">{cat.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-zinc-500">{pct.toFixed(0)}%</span>
                        <span className="text-sm font-medium text-zinc-200">{formatIDR(cat.total)}</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, backgroundColor: color }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}
