"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { formatIDR } from "@/lib/currency";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { CatatLogo } from "@/components/brand/CatatLogo";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from "recharts";

const COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
  "#ec4899",
  "#84cc16",
  "#f97316",
  "#6366f1",
];

export default function DashboardPage() {
  const period = format(new Date(), "yyyy-MM");
  const summary = useQuery(api.expenses.getExpenseSummary, { period });

  const monthName = format(new Date(), "MMMM yyyy", { locale: idLocale });
  const categoryData = [...(summary?.byCategory ?? [])]
    .sort((a, b) => b.total - a.total)
    .map((category, index) => ({
      ...category,
      color: category.color ?? COLORS[index % COLORS.length],
      percentage: summary && summary.total > 0 ? (category.total / summary.total) * 100 : 0,
    }));

  return (
    <div className="p-4 max-w-lg mx-auto space-y-4">
      <div className="flex items-start justify-between gap-4 pt-4">
        <div>
          <CatatLogo className="h-10" />
          <p className="mt-3 text-xl font-semibold text-foreground">Dashboard</p>
          <p className="text-sm text-muted-foreground">{monthName}</p>
        </div>
      </div>

      {/* Total card */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <p className="text-sm text-muted-foreground">Total Pengeluaran</p>
        {summary === undefined ? (
          <Skeleton className="mt-1 h-9 w-48 bg-muted" />
        ) : (
          <p className="mt-1 text-3xl font-bold text-card-foreground">
            {formatIDR(summary.total)}
          </p>
        )}
        <p className="mt-1 text-xs text-muted-foreground">
          {summary?.count ?? "–"} transaksi
        </p>
      </div>

      {summary === undefined && (
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <p className="mb-4 text-sm text-muted-foreground">Komposisi Pengeluaran</p>
          <div className="flex flex-col items-center gap-4">
            <Skeleton className="h-52 w-52 rounded-full bg-muted" />
            <div className="w-full space-y-3">
              {[...Array(4)].map((_, index) => (
                <Skeleton key={index} className="h-10 rounded-xl bg-muted" />
              ))}
            </div>
          </div>
        </div>
      )}

      {summary && categoryData.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <p className="mb-4 text-sm text-muted-foreground">Komposisi Pengeluaran</p>
          <div className="flex flex-col items-center gap-4">
            <div className="h-56 w-full max-w-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    dataKey="total"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={62}
                    outerRadius={90}
                    paddingAngle={2}
                    stroke="none"
                  >
                    {categoryData.map((entry) => (
                      <Cell key={entry.categoryId} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => [formatIDR(Number(value)), "Total"]}
                    contentStyle={{
                      background: "rgb(30, 41, 59)",
                      border: "1px solid rgb(75, 85, 99)",
                      borderRadius: 10,
                      boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
                      padding: "8px 12px",
                    }}
                    labelStyle={{ color: "#fafafa", fontWeight: 600, fontSize: 13 }}
                    itemStyle={{ color: "#d4d4d8", fontSize: 12 }}
                  />
                  <text x="50%" y="46%" textAnchor="middle" dominantBaseline="middle" className="fill-muted-foreground text-[12px]">
                    Total
                  </text>
                  <text x="50%" y="56%" textAnchor="middle" dominantBaseline="middle" className="fill-foreground text-[16px] font-semibold">
                    {formatIDR(summary.total)}
                  </text>
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="w-full space-y-2">
              {categoryData.map((category) => (
                <div
                  key={category.categoryId}
                  className="flex items-center justify-between rounded-xl border border-border bg-background/60 px-3 py-2"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: category.color }}
                    />
                    <span className="truncate text-sm text-foreground">{category.name}</span>
                  </div>
                  <div className="text-right">
                     <p className="text-sm font-medium text-foreground">{formatIDR(category.total)}</p>
                     <p className="text-xs text-muted-foreground">{category.percentage.toFixed(0)}%</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Category ranking */}
      {summary && categoryData.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <p className="mb-3 text-sm text-muted-foreground">Peringkat Kategori</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={categoryData} layout="vertical" margin={{ left: 8, right: 16 }}>
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="name"
                width={80}
                 tick={{ fill: "#6b7280", fontSize: 11 }}
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
                {categoryData.map((entry) => (
                  <Cell key={entry.categoryId} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {summary?.byCategory.length === 0 && (
        <div className="py-12 text-center text-muted-foreground">
          <p>Belum ada pengeluaran bulan ini.</p>
          <p className="text-sm mt-1">Tap + untuk menambah.</p>
        </div>
      )}
    </div>
  );
}
