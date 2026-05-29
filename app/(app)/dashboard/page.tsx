"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import Image from "next/image";
import Link from "next/link";
import { api } from "@/convex/_generated/api";
import { formatIDR } from "@/lib/currency";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { CatatLogo } from "@/components/brand/CatatLogo";
import { cn } from "@/lib/utils";
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
  CartesianGrid,
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
  const installmentOverview = useQuery(api.expenses.getInstallmentOverview, { period });
  const walletOverview = useQuery(api.wallets.getWalletOverview, { period });
  const [selectedWalletId, setSelectedWalletId] = useState<string>("");

  const selectedWallet =
    walletOverview?.wallets.find((wallet) => wallet._id === selectedWalletId) ??
    walletOverview?.wallets[0];

  const monthName = format(new Date(), "MMMM yyyy", { locale: idLocale });
  const categoryData = [...(summary?.byCategory ?? [])]
    .sort((a, b) => b.total - a.total)
    .map((category, index) => ({
      ...category,
      color: category.color ?? COLORS[index % COLORS.length],
      percentage:
        summary && summary.total > 0
          ? (category.total / summary.total) * 100
          : 0,
    }));

  return (
    <div className="relative p-4 max-w-lg mx-auto space-y-5">
      {/* Paper texture - adapts to light / dark */}
      <div
        className="fixed inset-0 -z-10
          bg-[#faf9f6] dark:bg-[#0f172a]
          bg-[radial-gradient(#e2e0d8_1px,transparent_1px)]
          dark:bg-[radial-gradient(#1e293b_1px,transparent_1px)]
          [background-size:32px_32px] opacity-60 dark:opacity-40"
        aria-hidden="true"
      />

      {/* Header */}
      <div className="flex items-start justify-between gap-4 pt-4">
        <div>
          <CatatLogo className="h-10" />
          <div className="mt-3 flex items-center gap-2">
            <span className="inline-block -rotate-1 bg-primary text-primary-foreground px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest rounded-md">
              Dashboard
            </span>
            <span className="text-sm text-muted-foreground font-medium">
              {monthName}
            </span>
          </div>
        </div>
      </div>

      {walletOverview && walletOverview.wallets.length > 0 && (
        <div className="overflow-x-auto scrollbar-hide -mx-4">
          <div className="flex w-max items-end gap-2 px-4">
            {walletOverview.wallets.map((wallet) => {
              const active = selectedWallet?._id === wallet._id;
              return (
                <button
                  key={wallet._id}
                  type="button"
                  onClick={() => setSelectedWalletId(wallet._id)}
                  className={cn(
                    "min-w-[9rem] shrink-0 rounded-t-2xl border border-b-0 px-4 py-3 text-left transition-all duration-200",
                    active
                      ? "bg-card text-foreground shadow-[2px_0px_0px_0px_rgba(0,0,0,0.05)] dark:shadow-[2px_0px_0px_0px_rgba(255,255,255,0.05)]"
                      : "bg-muted/70 text-muted-foreground hover:bg-muted"
                  )}
                >
                  {wallet.logo ? (
                    <Image
                      src={`/bank-logo/${wallet.logo}`}
                      alt={wallet.name}
                      width={20}
                      height={20}
                      className={cn("h-5 w-auto object-contain", active ? "brightness-0 dark:invert" : "opacity-60")}
                    />
                  ) : (
                    <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Wallet</p>
                  )}
                  <p className="mt-1 text-sm font-semibold">{wallet.name}</p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className={cn(
        "relative rounded-2xl border border-border bg-card p-4 shadow-[2px_3px_0px_0px_rgba(0,0,0,0.06)] dark:shadow-[2px_3px_0px_0px_rgba(255,255,255,0.06)]",
        walletOverview?.wallets.length ? "-mt-5 pt-6 rounded-t-none" : ""
      )}>
        <div className="flex items-center gap-2 mb-4">
          <span className="h-2 w-2 bg-primary/40 rounded-sm rotate-45" />
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Wallet Overview
          </p>
        </div>

        {walletOverview === undefined ? (
          <div className="space-y-3">
            <Skeleton className="h-16 rounded-xl bg-muted" />
            <Skeleton className="h-16 rounded-xl bg-muted" />
          </div>
        ) : walletOverview.wallets.length === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada wallet. Tambahkan wallet untuk mulai catat income dan budget.</p>
        ) : (
          <div className="space-y-3">
            {selectedWallet && (
              <div className="rounded-xl border border-dashed border-border bg-background/60 px-3 py-3 -rotate-[0.3deg]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">{selectedWallet.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Income {formatIDR(selectedWallet.monthIncome)} • Expense {formatIDR(selectedWallet.monthExpense)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-foreground">{formatIDR(selectedWallet.balance)}</p>
                    {selectedWallet.budgetAmount > 0 && (
                      <p className="mt-1 text-xs text-muted-foreground">Budget sisa {formatIDR(selectedWallet.budgetRemaining)}</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Total card */}
      <div className="relative rounded-2xl border border-border bg-card p-5
        shadow-[2px_3px_0px_0px_rgba(0,0,0,0.06)]
        dark:shadow-[2px_3px_0px_0px_rgba(255,255,255,0.06)]">
        <div className="absolute -top-2 left-6 h-4 w-16 bg-primary/20 border border-primary/30 rounded-sm -rotate-1 z-10" />

        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Total Pengeluaran
        </p>
        {summary === undefined ? (
          <Skeleton className="mt-2 h-10 w-48 bg-muted" />
        ) : (
          <p className="mt-2 text-3xl font-semibold text-card-foreground tracking-tight">
            {formatIDR(summary.total)}
          </p>
        )}
        <div className="mt-3 flex items-center gap-2">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary" />
          <p className="text-xs text-muted-foreground">
            {summary?.count ?? "–"} transaksi
          </p>
        </div>

        <div className="mt-4 border-t border-dashed border-border pt-2 flex justify-between items-center">
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/60">
            #{period}
          </span>
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/60">
            Receipt
          </span>
        </div>
      </div>

      {/* Skeleton */}
      {summary === undefined && (
        <div className="rounded-2xl border border-border bg-card p-4
          shadow-[2px_3px_0px_0px_rgba(0,0,0,0.06)]
          dark:shadow-[2px_3px_0px_0px_rgba(255,255,255,0.06)]">
          <div className="flex items-center gap-2 mb-4">
            <span className="h-2 w-2 bg-primary/40 rounded-sm rotate-45" />
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Komposisi
            </p>
          </div>
          <div className="flex flex-col items-center gap-4">
            <Skeleton className="h-52 w-52 rounded-full bg-muted border border-dashed border-border" />
            <div className="w-full space-y-3">
              {[...Array(4)].map((_, index) => (
                <Skeleton
                  key={index}
                  className="h-10 rounded-xl bg-muted border border-border"
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Pie Chart */}
      {summary && categoryData.length > 0 && (
        <div className="relative rounded-2xl border border-border bg-card p-4
          shadow-[2px_3px_0px_0px_rgba(0,0,0,0.06)]
          dark:shadow-[2px_3px_0px_0px_rgba(255,255,255,0.06)]">
          <div className="flex items-center gap-2 mb-4">
            <span className="h-2 w-2 bg-primary/40 rounded-sm rotate-45" />
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Komposisi Pengeluaran
            </p>
          </div>

          <div className="flex flex-col items-center gap-4">
            {/* Slight rotation for "pasted on" look */}
            <div className="h-56 w-full max-w-[280px] -rotate-[0.6deg]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    dataKey="total"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={58}
                    outerRadius={88}
                    paddingAngle={3}
                    stroke="none"
                  >
                    {categoryData.map((entry) => (
                      <Cell
                        key={entry.categoryId}
                        fill={entry.color}
                        stroke="var(--card)"
                        strokeWidth={3}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => [formatIDR(Number(value)), "Total"]}
                    contentStyle={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: 12,
                      boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
                      padding: "8px 12px",
                      fontSize: 12,
                      color: "var(--card-foreground)",
                    }}
                    labelStyle={{ fontWeight: 600, fontSize: 13, color: "inherit" }}
                    itemStyle={{ fontSize: 12, color: "inherit" }}
                  />
                  <text
                    x="50%"
                    y="46%"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="fill-muted-foreground text-[12px]"
                  >
                    Total
                  </text>
                  <text
                    x="50%"
                    y="56%"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="fill-card-foreground text-[16px] font-semibold"
                  >
                    {formatIDR(summary.total)}
                  </text>
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="w-full space-y-2">
              {categoryData.map((category, i) => (
                <div
                  key={category.categoryId}
                  className="flex items-center justify-between rounded-xl border border-border bg-muted/50 px-3 py-2"
                  style={{
                    transform: `rotate(${i % 2 === 0 ? -0.4 : 0.4}deg)`,
                  }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: category.color }}
                    />
                    <span className="truncate text-sm text-foreground">
                      {category.name}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-foreground">
                      {formatIDR(category.total)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {category.percentage.toFixed(0)}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Bar Chart */}
      {summary && categoryData.length > 0 && (
        <div className="relative rounded-2xl border border-border bg-card p-4
          shadow-[2px_3px_0px_0px_rgba(0,0,0,0.06)]
          dark:shadow-[2px_3px_0px_0px_rgba(255,255,255,0.06)]">
          <div className="absolute -top-2 right-8 h-4 w-20 bg-accent/50 border border-primary/20 rounded-sm rotate-[1deg] z-10" />

          <div className="flex items-center gap-2 mb-3">
            <span className="h-2 w-2 bg-primary/40 rounded-sm rotate-45" />
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Peringkat Kategori
            </p>
          </div>

          <div className="rotate-[0.5deg]">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={categoryData}
                layout="vertical"
                margin={{ left: 8, right: 16, top: 4 }}
              >
                <CartesianGrid
                  horizontal={false}
                  stroke="var(--border)"
                  strokeDasharray="4 4"
                  strokeOpacity={0.5}
                />
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={80}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                />
                <Tooltip
                  cursor={{ fill: "rgba(128,128,128,0.08)" }}
                  formatter={(value) => [formatIDR(Number(value)), "Total"]}
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 10,
                    boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
                    padding: "8px 12px",
                    color: "var(--card-foreground)",
                  }}
                  labelStyle={{ fontWeight: 600, fontSize: 13, color: "inherit" }}
                  itemStyle={{ fontSize: 12, color: "inherit" }}
                />
                <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                  {categoryData.map((entry) => (
                    <Cell
                      key={entry.categoryId}
                      fill={entry.color}
                      stroke="var(--card)"
                      strokeWidth={2}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="relative rounded-2xl border border-border bg-card p-4
        shadow-[2px_3px_0px_0px_rgba(0,0,0,0.06)]
        dark:shadow-[2px_3px_0px_0px_rgba(255,255,255,0.06)]">
        <div className="flex items-center gap-2 mb-4">
          <span className="h-2 w-2 bg-primary/40 rounded-sm rotate-45" />
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Cicilan Bulan Ini
          </p>
        </div>

        {installmentOverview === undefined ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, index) => (
              <Skeleton key={index} className="h-16 rounded-xl bg-muted" />
            ))}
          </div>
        ) : installmentOverview.activeInstallments.length === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada cicilan aktif bulan ini.</p>
        ) : (
          <div className="space-y-3">
            <div className="rounded-xl border border-dashed border-border bg-muted/40 px-3 py-3">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Total cicilan bulan ini</p>
              <p className="mt-1 text-xl font-semibold text-foreground">{formatIDR(installmentOverview.activeTotal)}</p>
              <p className="mt-1 text-xs text-muted-foreground">{installmentOverview.activeCount} cicilan aktif</p>
            </div>

            {installmentOverview.activeInstallments.map((item) => (
              <div key={item._id} className="rounded-xl border border-border bg-background/60 px-3 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{item.description}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Cicilan ke-{item.installmentNumber} dari {item.installmentCount}
                      {item.vendor ? ` • ${item.vendor.name}` : ""}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold text-foreground">{formatIDR(item.installmentAmount)}</p>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                  <span>Bunga {item.installmentRate}%</span>
                  <span>Sisa {item.remainingInstallments} cicilan</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="relative rounded-2xl border border-border bg-card p-4
        shadow-[2px_3px_0px_0px_rgba(0,0,0,0.06)]
        dark:shadow-[2px_3px_0px_0px_rgba(255,255,255,0.06)]">
        <div className="flex items-center gap-2 mb-4">
          <span className="h-2 w-2 bg-primary/40 rounded-sm rotate-45" />
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Riwayat Cicilan
          </p>
        </div>

        {installmentOverview === undefined ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, index) => (
              <Skeleton key={index} className="h-16 rounded-xl bg-muted" />
            ))}
          </div>
        ) : installmentOverview.history.length === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada transaksi cicilan.</p>
        ) : (
          <div className="space-y-3">
            {installmentOverview.history.map((item) => (
              <div key={item._id} className="rounded-xl border border-border bg-background/60 px-3 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{item.description}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {format(new Date(item.date), "d MMM yyyy", { locale: idLocale })}
                      {item.category ? ` • ${item.category.name}` : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-foreground">{item.installmentCount}x</p>
                    <p className="text-xs text-muted-foreground">{item.installmentRate}%</p>
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                  <span>Total {formatIDR(item.totalWithInterest)}</span>
                  <span>{formatIDR(item.installmentAmount)}/cicilan</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Empty state */}
      {summary?.byCategory.length === 0 && (
        <div className="relative rounded-2xl border border-border bg-card py-12 text-center
          shadow-[2px_3px_0px_0px_rgba(0,0,0,0.06)]
          dark:shadow-[2px_3px_0px_0px_rgba(255,255,255,0.06)]">
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 h-4 w-24 bg-secondary/60 border border-primary/20 rounded-sm -rotate-1 z-10" />
          <p className="text-base font-medium text-foreground">
            Belum ada pengeluaran bulan ini.
          </p>
          <p className="text-sm mt-1 text-muted-foreground">
            Tap + untuk menambah.
          </p>
        </div>
      )}

      <Link
        href="/reports"
        className="flex h-14 w-full items-center justify-center rounded-2xl border border-border bg-card text-sm font-medium text-foreground transition-colors hover:bg-accent"
      >
        View Detail Report
      </Link>
    </div>
  );
}
