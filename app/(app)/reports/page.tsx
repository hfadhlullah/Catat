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
  CartesianGrid,
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
    <div className="relative p-4 max-w-lg mx-auto space-y-5 pb-6">
      {/* Paper texture */}
      <div
        className="fixed inset-0 -z-10
          bg-[#faf9f6] dark:bg-[#0f172a]
          bg-[radial-gradient(#e2e0d8_1px,transparent_1px)]
          dark:bg-[radial-gradient(#1e293b_1px,transparent_1px)]
          [background-size:32px_32px] opacity-60 dark:opacity-40"
        aria-hidden="true"
      />

      <div className="flex items-center justify-between pt-4">
        <div className="flex items-center gap-2">
          <span className="inline-block -rotate-1 bg-primary text-primary-foreground px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest rounded-md">
            Laporan
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCurrent((d) => subMonths(d, 1))}
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="min-w-[110px] text-center text-sm text-foreground font-medium">{monthName}</span>
          <button
            onClick={() => setCurrent((d) => addMonths(d, 1))}
            disabled={period >= format(new Date(), "yyyy-MM")}
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-30"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Total */}
      <div className="relative rounded-2xl border border-border bg-card p-5
        shadow-[2px_3px_0px_0px_rgba(0,0,0,0.06)]
        dark:shadow-[2px_3px_0px_0px_rgba(255,255,255,0.06)]">
        <div className="absolute -top-2 left-6 h-4 w-16 bg-primary/20 border border-primary/30 rounded-sm -rotate-1 z-10" />

        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Total Pengeluaran
        </p>
        {isLoading ? (
          <Skeleton className="mt-2 h-10 w-48 bg-muted" />
        ) : (
          <p className="mt-2 text-3xl font-semibold text-card-foreground tracking-tight">{formatIDR(summary.total)}</p>
        )}
        {isLoading ? (
          <Skeleton className="mt-2 h-4 w-24 bg-muted" />
        ) : (
          <div className="mt-3 flex items-center gap-2">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary" />
            <p className="text-xs text-muted-foreground">{summary.count} transaksi</p>
          </div>
        )}
      </div>

      {/* 6-month trend */}
      <div className="relative rounded-2xl border border-border bg-card p-4
        shadow-[2px_3px_0px_0px_rgba(0,0,0,0.06)]
        dark:shadow-[2px_3px_0px_0px_rgba(255,255,255,0.06)]">
        <div className="absolute -top-2 right-8 h-4 w-20 bg-accent/50 border border-primary/20 rounded-sm rotate-[1deg] z-10" />

        <div className="flex items-center gap-2 mb-4">
          <span className="h-2 w-2 bg-primary/40 rounded-sm rotate-45" />
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Tren 6 Bulan</p>
        </div>

        <div className="rotate-[0.5deg]">
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={trend} barSize={28}>
              <CartesianGrid horizontal={false} stroke="var(--border)" strokeDasharray="4 4" strokeOpacity={0.5} />
              <XAxis dataKey="label" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip
                cursor={{ fill: "rgba(128,128,128,0.08)" }}
                content={({ active, payload }) =>
                  active && payload?.[0] ? (
                    <div className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-foreground shadow-[2px_3px_0px_0px_rgba(0,0,0,0.06)] dark:shadow-[2px_3px_0px_0px_rgba(255,255,255,0.06)]">
                      {formatIDR(payload[0].value as number)}
                    </div>
                  ) : null
                }
              />
              <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                {trend.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={entry.period === period ? "#3b82f6" : "var(--muted-foreground)"}
                    stroke="var(--card)"
                    strokeWidth={2}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Category breakdown */}
      <div className="relative rounded-2xl border border-border bg-card p-4
        shadow-[2px_3px_0px_0px_rgba(0,0,0,0.06)]
        dark:shadow-[2px_3px_0px_0px_rgba(255,255,255,0.06)]">
        <div className="flex items-center gap-2 mb-4">
          <span className="h-2 w-2 bg-primary/40 rounded-sm rotate-45" />
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Per Kategori</p>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-8 rounded-lg bg-muted" />)}
          </div>
        ) : summary.byCategory.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">Tidak ada data</p>
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
                      <span className="text-sm text-foreground">{cat.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{pct.toFixed(0)}%</span>
                        <span className="text-sm font-medium text-foreground">{formatIDR(cat.total)}</span>
                      </div>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
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
