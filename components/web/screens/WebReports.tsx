"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import Image from "next/image";
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

import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { formatIDR, formatIDRCompact } from "@/lib/currency";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
  "#06b6d4", "#ec4899", "#84cc16", "#f97316", "#6366f1",
];

const cardCls =
  "rounded-2xl border border-border bg-card shadow-[2px_3px_0px_0px_rgba(0,0,0,0.06)] dark:shadow-[2px_3px_0px_0px_rgba(255,255,255,0.06)]";

function useLast6Months(endDate: Date, walletId?: string) {
  const periods = Array.from({ length: 6 }, (_, i) => format(subMonths(endDate, 5 - i), "yyyy-MM"));
  const wid = walletId ? (walletId as Id<"wallets">) : undefined;
  const q0 = useQuery(api.transactions.getTransactionSummary, { period: periods[0], walletId: wid });
  const q1 = useQuery(api.transactions.getTransactionSummary, { period: periods[1], walletId: wid });
  const q2 = useQuery(api.transactions.getTransactionSummary, { period: periods[2], walletId: wid });
  const q3 = useQuery(api.transactions.getTransactionSummary, { period: periods[3], walletId: wid });
  const q4 = useQuery(api.transactions.getTransactionSummary, { period: periods[4], walletId: wid });
  const q5 = useQuery(api.transactions.getTransactionSummary, { period: periods[5], walletId: wid });
  return [q0, q1, q2, q3, q4, q5].map((q, i) => ({
    period: periods[i],
    label: format(subMonths(endDate, 5 - i), "MMM", { locale: idLocale }),
    total: q?.expenseTotal ?? 0,
    loading: q === undefined,
  }));
}

export function WebReports() {
  const [current, setCurrent] = useState(new Date());
  const period = format(current, "yyyy-MM");
  const monthName = format(current, "MMMM yyyy", { locale: idLocale });

  const walletOverview = useQuery(api.wallets.getWalletOverview, { period });
  const [selectedWalletId, setSelectedWalletId] = useState<string>("");
  const effectiveSelectedWalletId = selectedWalletId || walletOverview?.wallets[0]?._id || "";
  const selectedWalletIdCast = effectiveSelectedWalletId ? (effectiveSelectedWalletId as Id<"wallets">) : undefined;

  const summary = useQuery(api.transactions.getTransactionSummary, { period, walletId: selectedWalletIdCast });
  const installmentOverview = useQuery(api.transactions.getInstallmentOverview, { period, walletId: selectedWalletIdCast });
  const trend = useLast6Months(current, effectiveSelectedWalletId || undefined);
  const selectedWallet = walletOverview?.wallets.find((w) => w._id === effectiveSelectedWalletId) ?? walletOverview?.wallets[0];

  const isLoading = summary === undefined;

  const categoryData = isLoading ? [] : [...summary.byCategory].sort((a, b) => b.total - a.total).map((cat, i) => ({
    ...cat,
    color: cat.color ?? COLORS[i % COLORS.length],
    percentage: summary.expenseTotal > 0 ? (cat.total / summary.expenseTotal) * 100 : 0,
  }));

  const incomeCategoryData = isLoading ? [] : [...summary.byIncomeCategory].sort((a, b) => b.total - a.total).map((cat, i) => ({
    ...cat,
    color: cat.color ?? COLORS[(i + 3) % COLORS.length],
    percentage: summary.incomeTotal > 0 ? (cat.total / summary.incomeTotal) * 100 : 0,
  }));

  const tooltipStyle = {
    background: "var(--card)",
    border: "1px solid var(--border)",
    borderRadius: 10,
    boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
    padding: "8px 12px",
    color: "var(--card-foreground)",
  };

  return (
    <div className="space-y-6">
      {/* Header with month nav */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="inline-block -rotate-1 rounded-md bg-primary px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-primary-foreground">
            Laporan
          </span>
          <h1 className="text-2xl font-bold text-card-foreground">Analitik</h1>
        </div>
        <div className="flex items-center gap-1 rounded-xl border border-border bg-card px-2">
          <button onClick={() => setCurrent((d) => subMonths(d, 1))} className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[128px] text-center text-sm font-medium text-foreground">{monthName}</span>
          <button onClick={() => setCurrent((d) => addMonths(d, 1))} disabled={period >= format(new Date(), "yyyy-MM")} className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-30">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Wallet selector */}
      {walletOverview && walletOverview.wallets.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {walletOverview.wallets.map((wallet) => {
            const active = wallet._id === selectedWallet?._id;
            return (
              <button
                key={wallet._id}
                type="button"
                onClick={() => setSelectedWalletId(active ? "" : wallet._id)}
                className={cn(
                  "flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-medium transition-all duration-150",
                  active ? "border-transparent bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground hover:border-primary/30"
                )}
              >
                {wallet.logo && <Image src={`/bank-logo/${wallet.logo}`} alt={wallet.name} width={16} height={16} className="h-4 w-auto object-contain" />}
                {wallet.label || wallet.name}
              </button>
            );
          })}
        </div>
      )}

      {/* KPI row */}
      <div className={cn(cardCls, "p-5")}>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Pengeluaran</p>
            {isLoading ? <Skeleton className="mt-2 h-9 w-full bg-muted" /> : (
              <p className={cn("mt-2 flex items-center gap-1 text-2xl font-semibold tracking-tight", summary.expenseTotal > 0 ? "text-destructive" : "text-card-foreground")}>
                {summary.expenseTotal > 0 && <TriangleIcon className="h-3 w-3 shrink-0 rotate-180 fill-current" />}
                {formatIDRCompact(summary.expenseTotal)}
              </p>
            )}
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Pemasukan</p>
            {isLoading ? <Skeleton className="mt-2 h-9 w-full bg-muted" /> : (
              <p className={cn("mt-2 flex items-center gap-1 text-2xl font-semibold tracking-tight", summary.incomeTotal > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-card-foreground")}>
                {summary.incomeTotal > 0 && <TriangleIcon className="h-3 w-3 shrink-0 fill-current" />}
                {formatIDRCompact(summary.incomeTotal)}
              </p>
            )}
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Net</p>
            {isLoading ? <Skeleton className="mt-2 h-9 w-full bg-muted" /> : (
              <p className="mt-2 text-2xl font-semibold tracking-tight text-card-foreground">{formatIDRCompact(summary.net)}</p>
            )}
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Transaksi</p>
            {isLoading ? <Skeleton className="mt-2 h-9 w-full bg-muted" /> : (
              <p className="mt-2 text-2xl font-semibold tracking-tight text-card-foreground">{summary.count}</p>
            )}
            {!isLoading && <p className="mt-1 text-xs text-muted-foreground">{summary.expenseCount} keluar · {summary.incomeCount} masuk</p>}
          </div>
        </div>
      </div>

      {/* Main grid: left charts, right sidebar */}
      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          {/* 6-month trend */}
          <div className={cn(cardCls, "p-5")}>
            <div className="mb-4 flex items-center gap-2">
              <span className="h-2 w-2 rotate-45 rounded-sm bg-primary/40" />
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Tren 6 Bulan (Pengeluaran)</p>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={trend} barSize={36}>
                <CartesianGrid horizontal={false} stroke="var(--border)" strokeDasharray="4 4" strokeOpacity={0.5} />
                <XAxis dataKey="label" tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip cursor={{ fill: "rgba(128,128,128,0.08)" }} content={({ active, payload }) =>
                  active && payload?.[0] ? (
                    <div style={tooltipStyle} className="text-xs">{formatIDR(payload[0].value as number)}</div>
                  ) : null
                } />
                <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                  {trend.map((entry, i) => (
                    <Cell key={i} fill={entry.period === period ? "#3b82f6" : "var(--muted-foreground)"} stroke="var(--card)" strokeWidth={2} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Side-by-side category breakdowns */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Expense categories */}
            <div className={cn(cardCls, "p-5")}>
              <div className="mb-4 flex items-center gap-2">
                <span className="h-2 w-2 rotate-45 rounded-sm bg-primary/40" />
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Pengeluaran Per Kategori</p>
              </div>
              {isLoading ? (
                <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-8 rounded-lg bg-muted" />)}</div>
              ) : categoryData.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">Tidak ada data</p>
              ) : (
                <div className="space-y-3">
                  {categoryData.map((cat) => (
                    <div key={cat.categoryId}>
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-sm text-foreground">{cat.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{cat.percentage.toFixed(0)}%</span>
                          <span className={cn("flex items-center gap-0.5 text-sm font-medium", cat.total > 0 ? "text-destructive" : "text-foreground")}>
                            {cat.total > 0 && <TriangleIcon className="h-2 w-2 shrink-0 rotate-180 fill-current" />}
                            {formatIDR(cat.total)}
                          </span>
                        </div>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${cat.percentage}%`, backgroundColor: cat.color }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Income categories */}
            <div className={cn(cardCls, "p-5")}>
              <div className="mb-4 flex items-center gap-2">
                <span className="h-2 w-2 rotate-45 rounded-sm bg-emerald-400/60" />
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Pemasukan Per Kategori</p>
              </div>
              {isLoading ? (
                <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-8 rounded-lg bg-muted" />)}</div>
              ) : incomeCategoryData.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">Tidak ada data</p>
              ) : (
                <div className="space-y-3">
                  {incomeCategoryData.map((cat) => (
                    <div key={cat.categoryId}>
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-sm text-foreground">{cat.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{cat.percentage.toFixed(0)}%</span>
                          <span className={cn("flex items-center gap-0.5 text-sm font-medium", cat.total > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-foreground")}>
                            {cat.total > 0 && <TriangleIcon className="h-2 w-2 shrink-0 fill-current" />}
                            {formatIDR(cat.total)}
                          </span>
                        </div>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${cat.percentage}%`, backgroundColor: cat.color }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Horizontal bar charts */}
          {!isLoading && categoryData.length > 0 && (
            <div className={cn(cardCls, "p-5")}>
              <div className="mb-3 flex items-center gap-2">
                <span className="h-2 w-2 rotate-45 rounded-sm bg-primary/40" />
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Peringkat Pengeluaran</p>
              </div>
              <ResponsiveContainer width="100%" height={Math.max(180, categoryData.length * 40)}>
                <BarChart data={categoryData} layout="vertical" margin={{ left: 8, right: 16, top: 4 }}>
                  <CartesianGrid horizontal={false} stroke="var(--border)" strokeDasharray="4 4" strokeOpacity={0.5} />
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={96} tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
                  <Tooltip cursor={{ fill: "rgba(128,128,128,0.08)" }} formatter={(v) => [formatIDR(Number(v)), "Total"]} contentStyle={tooltipStyle} />
                  <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                    {categoryData.map((e) => <Cell key={e.categoryId} fill={e.color} stroke="var(--card)" strokeWidth={2} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Right sidebar: wallet budgets + installments */}
        <div className="space-y-6">
          {/* Wallet & budget */}
          <div className={cn(cardCls, "p-5")}>
            <div className="mb-4 flex items-center gap-2">
              <span className="h-2 w-2 rotate-45 rounded-sm bg-primary/40" />
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Wallet & Budget</p>
            </div>
            {walletOverview === undefined ? (
              <div className="space-y-3">{[...Array(2)].map((_, i) => <Skeleton key={i} className="h-16 rounded-xl bg-muted" />)}</div>
            ) : walletOverview.wallets.length === 0 ? (
              <p className="text-sm text-muted-foreground">Belum ada wallet.</p>
            ) : (
              <div className="space-y-3">
                {walletOverview.wallets.map((wallet) => (
                  <div key={wallet._id} className="rounded-xl border border-border bg-background/60 px-3 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-foreground">{wallet.label || wallet.name}</p>
                        <p className="mt-1 text-xs text-muted-foreground">Saldo {formatIDR(wallet.balance)}</p>
                      </div>
                      <div className="text-right text-xs text-muted-foreground">
                        <p className="text-emerald-600 dark:text-emerald-400">{formatIDRCompact(wallet.monthIncome)}</p>
                        <p className="mt-1 text-destructive">{formatIDRCompact(wallet.monthExpense)}</p>
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

          {/* Active installments */}
          <div className={cn(cardCls, "p-5")}>
            <div className="mb-4 flex items-center gap-2">
              <span className="h-2 w-2 rotate-45 rounded-sm bg-primary/40" />
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Cicilan Aktif</p>
            </div>
            {installmentOverview === undefined ? (
              <div className="space-y-3">{[...Array(2)].map((_, i) => <Skeleton key={i} className="h-14 rounded-xl bg-muted" />)}</div>
            ) : installmentOverview.activeInstallments.length === 0 ? (
              <p className="text-sm text-muted-foreground">Tidak ada cicilan aktif.</p>
            ) : (
              <div className="space-y-3">
                <div className="rounded-xl border border-dashed border-border bg-muted/40 px-3 py-2">
                  <p className="text-xs text-muted-foreground">Total tagihan cicilan</p>
                  <p className="mt-0.5 text-lg font-semibold text-foreground">{formatIDR(installmentOverview.activeTotal)}</p>
                </div>
                {installmentOverview.activeInstallments.map((item) => (
                  <div key={item._id} className="rounded-xl border border-border bg-background/60 px-3 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{item.description}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">Cicilan ke-{item.installmentNumber}/{item.installmentCount}{item.vendor ? ` · ${item.vendor.name}` : ""}</p>
                      </div>
                      <p className="shrink-0 text-sm font-semibold text-foreground">{formatIDR(item.installmentAmount)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
