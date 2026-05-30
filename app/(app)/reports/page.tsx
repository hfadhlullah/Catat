"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import Image from "next/image";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { formatIDR, formatIDRCompact } from "@/lib/currency";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { format, subMonths, addMonths } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { ChevronLeft, ChevronRight, TriangleIcon } from "lucide-react";
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

function useLast6Months(endDate: Date, walletId?: string) {
  const periods = Array.from({ length: 6 }, (_, i) =>
    format(subMonths(endDate, 5 - i), "yyyy-MM")
  );
  const wid = walletId ? (walletId as Id<"wallets">) : undefined;
  const args0 = { period: periods[0], walletId: wid };
  const args1 = { period: periods[1], walletId: wid };
  const args2 = { period: periods[2], walletId: wid };
  const args3 = { period: periods[3], walletId: wid };
  const args4 = { period: periods[4], walletId: wid };
  const args5 = { period: periods[5], walletId: wid };
  const q0 = useQuery(api.transactions.getTransactionSummary, args0);
  const q1 = useQuery(api.transactions.getTransactionSummary, args1);
  const q2 = useQuery(api.transactions.getTransactionSummary, args2);
  const q3 = useQuery(api.transactions.getTransactionSummary, args3);
  const q4 = useQuery(api.transactions.getTransactionSummary, args4);
  const q5 = useQuery(api.transactions.getTransactionSummary, args5);

  return [q0, q1, q2, q3, q4, q5].map((q, i) => ({
    period: periods[i],
    label: format(subMonths(endDate, 5 - i), "MMM", { locale: idLocale }),
    total: q?.expenseTotal ?? 0,
    loading: q === undefined,
  }));
}

export default function ReportsPage() {
  const [current, setCurrent] = useState(new Date());
  const period = format(current, "yyyy-MM");
  const walletOverview = useQuery(api.wallets.getWalletOverview, { period });
  const [selectedWalletId, setSelectedWalletId] = useState<string>("");
  const effectiveSelectedWalletId = selectedWalletId || walletOverview?.wallets[0]?._id || "";
  const selectedWalletIdCast = effectiveSelectedWalletId ? (effectiveSelectedWalletId as Id<"wallets">) : undefined;
  const summary = useQuery(api.transactions.getTransactionSummary, {
    period,
    walletId: selectedWalletIdCast,
  });
  const installmentOverview = useQuery(api.transactions.getInstallmentOverview, {
    period,
    walletId: selectedWalletIdCast,
  });
  const trend = useLast6Months(current, effectiveSelectedWalletId || undefined);

  const monthName = format(current, "MMMM yyyy", { locale: idLocale });
  const isLoading = summary === undefined;

  const categoryData = isLoading
    ? []
    : [...summary.byCategory]
        .sort((a, b) => b.total - a.total)
        .map((cat, index) => ({
          ...cat,
          color: cat.color ?? COLORS[index % COLORS.length],
          percentage:
            summary.expenseTotal > 0
              ? (cat.total / summary.expenseTotal) * 100
              : 0,
        }));

  const incomeCategoryData = isLoading
    ? []
    : [...summary.byIncomeCategory]
        .sort((a, b) => b.total - a.total)
        .map((cat, index) => ({
          ...cat,
          color: cat.color ?? COLORS[(index + 3) % COLORS.length],
          percentage:
            summary.incomeTotal > 0
              ? (cat.total / summary.incomeTotal) * 100
              : 0,
        }));

  const selectedWallet =
    walletOverview?.wallets.find((wallet) => wallet._id === effectiveSelectedWalletId) ??
    walletOverview?.wallets[0];

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

      {walletOverview && walletOverview.wallets.length > 0 && (
        <div className="overflow-x-auto scrollbar-hide -mx-4">
          <div className="flex w-max items-end gap-2 px-4">
            {walletOverview.wallets.map((wallet) => {
              const active = selectedWallet?._id === wallet._id;
              return (
                <button
                  key={wallet._id}
                  type="button"
                  onClick={() => setSelectedWalletId(active ? "" : wallet._id)}
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
                      className="h-5 w-auto object-contain"
                    />
                  ) : (
                    <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Wallet</p>
                  )}
                  <p className="mt-1 text-sm font-semibold">{wallet.label || wallet.name}</p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Total */}
      <div className={cn(
        "relative rounded-2xl border border-border bg-card p-5 shadow-[2px_3px_0px_0px_rgba(0,0,0,0.06)] dark:shadow-[2px_3px_0px_0px_rgba(255,255,255,0.06)]",
        walletOverview?.wallets.length ? "-mt-5 rounded-t-none pt-6" : ""
      )}>
        <div className="absolute -top-2 left-6 h-4 w-16 bg-primary/20 border border-primary/30 rounded-sm -rotate-1 z-10" />

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Pengeluaran
            </p>
            {isLoading ? (
              <Skeleton className="mt-2 h-10 w-full bg-muted" />
            ) : (
              <p className={cn("mt-2 text-2xl font-semibold tracking-tight flex items-center gap-1", summary.expenseTotal > 0 ? "text-destructive" : "text-card-foreground")}>{summary.expenseTotal > 0 && <TriangleIcon className="w-3 h-3 shrink-0 fill-current rotate-180" />}{formatIDRCompact(summary.expenseTotal)}</p>
            )}
          </div>
          <div className="text-right">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Pemasukan
            </p>
            {isLoading ? (
              <Skeleton className="mt-2 h-10 w-full bg-muted" />
            ) : (
              <p className={cn("mt-2 text-2xl font-semibold tracking-tight flex items-center justify-end gap-1", summary.incomeTotal > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-card-foreground")}>{summary.incomeTotal > 0 && <TriangleIcon className="w-3 h-3 shrink-0 fill-current" />}{formatIDRCompact(summary.incomeTotal)}</p>
            )}
          </div>
        </div>
        {isLoading ? (
          <Skeleton className="mt-3 h-4 w-48 bg-muted" />
        ) : (
          <div className="mt-3 flex items-center gap-2">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary" />
            <p className="text-xs text-muted-foreground">{summary.expenseCount} pengeluaran • {summary.incomeCount} pemasukan • Net {formatIDR(summary.net)}</p>
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

      {/* Category breakdown — Pengeluaran */}
      <div className="relative rounded-2xl border border-border bg-card p-4
        shadow-[2px_3px_0px_0px_rgba(0,0,0,0.06)]
        dark:shadow-[2px_3px_0px_0px_rgba(255,255,255,0.06)]">
        <div className="flex items-center gap-2 mb-4">
          <span className="h-2 w-2 bg-primary/40 rounded-sm rotate-45" />
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Pengeluaran Per Kategori</p>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-8 rounded-lg bg-muted" />)}
          </div>
        ) : summary.byCategory.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">Tidak ada data pengeluaran</p>
        ) : (
          <div className="space-y-3">
            {[...summary.byCategory]
              .sort((a, b) => b.total - a.total)
              .map((cat, i) => {
                const pct = summary.expenseTotal > 0 ? (cat.total / summary.expenseTotal) * 100 : 0;
                const color = cat.color ?? COLORS[i % COLORS.length];
                return (
                  <div key={cat.categoryId}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-foreground">{cat.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{pct.toFixed(0)}%</span>
                        <span className={cn("text-sm font-medium flex items-center gap-0.5", cat.total > 0 ? "text-destructive" : "text-foreground")}>{cat.total > 0 && <TriangleIcon className="w-2 h-2 shrink-0 fill-current rotate-180" />}{formatIDR(cat.total)}</span>
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

      {/* Bar Chart — Peringkat Pengeluaran */}
      {!isLoading && categoryData.length > 0 && (
        <div className="relative rounded-2xl border border-border bg-card p-4
          shadow-[2px_3px_0px_0px_rgba(0,0,0,0.06)]
          dark:shadow-[2px_3px_0px_0px_rgba(255,255,255,0.06)]">
          <div className="absolute -top-2 right-8 h-4 w-20 bg-accent/50 border border-primary/20 rounded-sm rotate-[1deg] z-10" />

          <div className="flex items-center gap-2 mb-3">
            <span className="h-2 w-2 bg-primary/40 rounded-sm rotate-45" />
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Peringkat Pengeluaran
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

      {/* Category breakdown — Pemasukan */}
      <div className="relative rounded-2xl border border-border bg-card p-4
        shadow-[2px_3px_0px_0px_rgba(0,0,0,0.06)]
        dark:shadow-[2px_3px_0px_0px_rgba(255,255,255,0.06)]">
        <div className="flex items-center gap-2 mb-4">
          <span className="h-2 w-2 bg-emerald-400/60 rounded-sm rotate-45" />
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Pemasukan Per Kategori</p>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-8 rounded-lg bg-muted" />)}
          </div>
        ) : summary.byIncomeCategory.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">Tidak ada data pemasukan</p>
        ) : (
          <div className="space-y-3">
            {[...summary.byIncomeCategory]
              .sort((a, b) => b.total - a.total)
              .map((cat, i) => {
                const pct = summary.incomeTotal > 0 ? (cat.total / summary.incomeTotal) * 100 : 0;
                const color = cat.color ?? COLORS[(i + 3) % COLORS.length];
                return (
                  <div key={cat.categoryId}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-foreground">{cat.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{pct.toFixed(0)}%</span>
                        <span className={cn("text-sm font-medium flex items-center gap-0.5", cat.total > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-foreground")}>{cat.total > 0 && <TriangleIcon className="w-2 h-2 shrink-0 fill-current" />}{formatIDR(cat.total)}</span>
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

      {/* Bar Chart — Peringkat Pemasukan */}
      {!isLoading && incomeCategoryData.length > 0 && (
        <div className="relative rounded-2xl border border-border bg-card p-4
          shadow-[2px_3px_0px_0px_rgba(0,0,0,0.06)]
          dark:shadow-[2px_3px_0px_0px_rgba(255,255,255,0.06)]">
          <div className="absolute -top-2 right-8 h-4 w-20 bg-emerald-400/30 border border-emerald-400/40 rounded-sm rotate-[1deg] z-10" />

          <div className="flex items-center gap-2 mb-3">
            <span className="h-2 w-2 bg-emerald-400/60 rounded-sm rotate-45" />
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Peringkat Pemasukan
            </p>
          </div>

          <div className="-rotate-[0.5deg]">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={incomeCategoryData}
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
                  {incomeCategoryData.map((entry) => (
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
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Wallet Dan Budget</p>
        </div>

        {walletOverview === undefined ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 rounded-xl bg-muted" />)}
          </div>
        ) : walletOverview.wallets.length === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada wallet pada akun ini.</p>
        ) : selectedWalletId ? (
          <div className="space-y-3">
            {selectedWallet && (
              <div className="rounded-xl border border-border bg-background/60 px-3 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">{selectedWallet.label || selectedWallet.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Saldo {formatIDR(selectedWallet.balance)}</p>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <p>Income {formatIDR(selectedWallet.monthIncome)}</p>
                    <p className="mt-1">Expense {formatIDR(selectedWallet.monthExpense)}</p>
                  </div>
                </div>
                {selectedWallet.budgetAmount > 0 && (
                  <div className="mt-3">
                    <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                      <span>Budget {formatIDR(selectedWallet.budgetAmount)}</span>
                      <span>Sisa {formatIDR(selectedWallet.budgetRemaining)}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${selectedWallet.budgetUsedPct}%` }} />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="rounded-xl border border-dashed border-border bg-muted/40 px-3 py-3">
              <div className="flex items-center justify-between text-sm text-foreground">
                <span>Income periode ini</span>
                <span className="font-semibold">{formatIDR(walletOverview.totalMonthIncome)}</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-sm text-foreground">
                <span>Expense periode ini</span>
                <span className="font-semibold">{formatIDR(walletOverview.totalMonthExpense)}</span>
              </div>
            </div>

            {walletOverview.wallets.map((wallet) => (
              <div key={wallet._id} className="rounded-xl border border-border bg-background/60 px-3 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">{wallet.label || wallet.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Saldo {formatIDR(wallet.balance)}</p>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <p>Income {formatIDR(wallet.monthIncome)}</p>
                    <p className="mt-1">Expense {formatIDR(wallet.monthExpense)}</p>
                  </div>
                </div>
                {wallet.budgetAmount > 0 && (
                  <div className="mt-3">
                    <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                      <span>Budget {formatIDR(wallet.budgetAmount)}</span>
                      <span>Sisa {formatIDR(wallet.budgetRemaining)}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${wallet.budgetUsedPct}%` }} />
                    </div>
                  </div>
                )}
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
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Cicilan Pada Periode Ini</p>
        </div>

        {installmentOverview === undefined ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 rounded-xl bg-muted" />)}
          </div>
        ) : installmentOverview.activeInstallments.length === 0 ? (
          <p className="text-sm text-muted-foreground">Tidak ada cicilan aktif pada periode ini.</p>
        ) : (
          <div className="space-y-3">
            <div className="rounded-xl border border-dashed border-border bg-muted/40 px-3 py-3">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Total tagihan cicilan</p>
              <p className="mt-1 text-xl font-semibold text-foreground">{formatIDR(installmentOverview.activeTotal)}</p>
            </div>

            {installmentOverview.activeInstallments.map((item) => (
              <div key={item._id} className="rounded-xl border border-border bg-background/60 px-3 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{item.description}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Cicilan ke-{item.installmentNumber}/{item.installmentCount}
                      {item.vendor ? ` • ${item.vendor.name}` : ""}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold text-foreground">{formatIDR(item.installmentAmount)}</p>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                  <span>Total {formatIDR(item.totalWithInterest)}</span>
                  <span>Bunga {item.installmentRate}%</span>
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
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Riwayat Cicilan</p>
        </div>

        {installmentOverview === undefined ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 rounded-xl bg-muted" />)}
          </div>
        ) : installmentOverview.history.length === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada riwayat cicilan.</p>
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
    </div>
  );
}
