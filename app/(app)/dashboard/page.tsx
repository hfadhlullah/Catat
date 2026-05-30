"use client";

import { useState } from "react";
import { useQuery, useMutation, usePaginatedQuery } from "convex/react";
import Image from "next/image";
import Link from "next/link";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { formatIDR, formatIDRCompact } from "@/lib/currency";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { CatatLogo } from "@/components/brand/CatatLogo";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from "recharts";
import { UserPlus, Check, X, ArrowRight, TriangleIcon } from "lucide-react";

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
  const walletOverview = useQuery(api.wallets.getWalletOverview, { period });
  const [selectedWalletId, setSelectedWalletId] = useState<string>("");
  const [compositionDir, setCompositionDir] = useState<"expense" | "income">("expense");
  const effectiveSelectedWalletId = selectedWalletId || walletOverview?.wallets[0]?._id || "";
  const summary = useQuery(api.transactions.getTransactionSummary, {
    period,
    walletId: effectiveSelectedWalletId ? (effectiveSelectedWalletId as Id<"wallets">) : undefined,
  });

  const { results: recentTransactions, status: txStatus } = usePaginatedQuery(
    api.transactions.listTransactions,
    {
      walletId: effectiveSelectedWalletId ? (effectiveSelectedWalletId as Id<"wallets">) : undefined,
    },
    { initialNumItems: 5 }
  );

  const pendingInvites = useQuery(api.walletSharing.listPendingInvites);
  const acceptInvite = useMutation(api.walletSharing.acceptInvite);
  const rejectInvite = useMutation(api.walletSharing.rejectInvite);
  const [processingInviteId, setProcessingInviteId] = useState<string | null>(null);

  const selectedWallet =
    walletOverview?.wallets.find((wallet) => wallet._id === effectiveSelectedWalletId) ??
    walletOverview?.wallets[0];

  const monthName = format(new Date(), "MMMM yyyy", { locale: idLocale });
  const categoryData = [...(summary?.byCategory ?? [])]
    .sort((a, b) => b.total - a.total)
    .map((category, index) => ({
      ...category,
      color: category.color ?? COLORS[index % COLORS.length],
      percentage:
        summary && summary.expenseTotal > 0
          ? (category.total / summary.expenseTotal) * 100
          : 0,
    }));

  const incomeCategoryData = [...(summary?.byIncomeCategory ?? [])]
    .sort((a, b) => b.total - a.total)
    .map((category, index) => ({
      ...category,
      color: category.color ?? COLORS[(index + 3) % COLORS.length],
      percentage:
        summary && summary.incomeTotal > 0
          ? (category.total / summary.incomeTotal) * 100
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

      {pendingInvites && pendingInvites.length > 0 && (
        <div className="space-y-2">
          {pendingInvites.map((invite) => (
            <div key={invite._id} className="relative rounded-2xl border border-border bg-card p-4 shadow-[2px_3px_0px_0px_rgba(0,0,0,0.06)] dark:shadow-[2px_3px_0px_0px_rgba(255,255,255,0.06)]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <UserPlus className="h-4 w-4 text-primary" />
                    <p className="text-sm font-medium text-foreground">Undangan Wallet</p>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{invite.fromUser?.name}</span> mengundang Anda ke wallet{" "}
                    <span className="font-medium text-foreground">{invite.wallet?.label || invite.wallet?.name}</span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      setProcessingInviteId(invite._id);
                      try {
                        await acceptInvite({ inviteId: invite._id });
                        toast.success("Undangan diterima");
                      } catch {
                        toast.error("Gagal menerima undangan");
                      } finally {
                        setProcessingInviteId(null);
                      }
                    }}
                    disabled={processingInviteId === invite._id}
                    className="rounded-lg bg-primary p-2 text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      setProcessingInviteId(invite._id);
                      try {
                        await rejectInvite({ inviteId: invite._id });
                        toast.success("Undangan ditolak");
                      } catch {
                        toast.error("Gagal menolak undangan");
                      } finally {
                        setProcessingInviteId(null);
                      }
                    }}
                    disabled={processingInviteId === invite._id}
                    className="rounded-lg border border-border bg-background p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

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
          <div
            key={selectedWalletId}
            className="animate-wallet-slide-up space-y-3"
          >
            {selectedWallet && (
              <div className="rounded-xl border border-dashed border-border bg-background/60 px-3 py-3 -rotate-[0.3deg]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                     <p className="text-sm font-medium text-foreground">{selectedWallet.label || selectedWallet.name}</p>
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

      {/* Total card — Pengeluaran & Pemasukan */}
      <div className="relative rounded-2xl border border-border bg-card p-5
        shadow-[2px_3px_0px_0px_rgba(0,0,0,0.06)]
        dark:shadow-[2px_3px_0px_0px_rgba(255,255,255,0.06)]">
        <div className="absolute -top-2 left-6 h-4 w-16 bg-primary/20 border border-primary/30 rounded-sm -rotate-1 z-10" />

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Pengeluaran
            </p>
            {summary === undefined ? (
              <Skeleton className="mt-2 h-10 w-full bg-muted" />
            ) : (
              <p className={cn("mt-2 text-2xl font-semibold tracking-tight flex items-center gap-1", summary.expenseTotal > 0 ? "text-destructive" : "text-card-foreground")}>
                {summary.expenseTotal > 0 && <TriangleIcon className="w-3 h-3 shrink-0 fill-current rotate-180" />}
                {formatIDRCompact(summary.expenseTotal)}
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Pemasukan
            </p>
            {summary === undefined ? (
              <Skeleton className="mt-2 h-10 w-full bg-muted" />
            ) : (
              <p className={cn("mt-2 text-2xl font-semibold tracking-tight flex items-center justify-end gap-1", summary.incomeTotal > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-card-foreground")}>
                {summary.incomeTotal > 0 && <TriangleIcon className="w-3 h-3 shrink-0 fill-current" />}
                {formatIDRCompact(summary.incomeTotal)}
              </p>
            )}
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary" />
          <p className="text-xs text-muted-foreground">
            {summary?.expenseCount ?? "–"} pengeluaran • {summary?.incomeCount ?? "–"} pemasukan
          </p>
        </div>
        {summary && (
          <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted-foreground">
            <span>Net {formatIDR(summary.net)}</span>
            <span>{summary.count} total transaksi</span>
          </div>
        )}

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

      {/* Komposisi — toggled */}
      {summary && (categoryData.length > 0 || incomeCategoryData.length > 0) && (
        <div className="relative rounded-2xl border border-border bg-card p-4
          shadow-[2px_3px_0px_0px_rgba(0,0,0,0.06)]
          dark:shadow-[2px_3px_0px_0px_rgba(255,255,255,0.06)]">
          {/* Tape — top right */}
          <div className="absolute -top-2 right-6 h-4 w-16 bg-primary/20 border border-primary/30 rounded-sm rotate-1 z-10" />

          <div className="flex items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2">
              <span className={cn("h-2 w-2 rounded-sm rotate-45", compositionDir === "expense" ? "bg-primary/40" : "bg-emerald-400/60")} />
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Komposisi {compositionDir === "expense" ? "Pengeluaran" : "Pemasukan"}
              </p>
            </div>
            <div className="flex rounded-lg border border-border overflow-hidden">
              <button
                type="button"
                onClick={() => setCompositionDir("expense")}
                className={cn(
                  "px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider transition-colors",
                  compositionDir === "expense"
                    ? "bg-primary text-primary-foreground"
                    : "bg-background text-muted-foreground hover:bg-accent"
                )}
              >
                Keluar
              </button>
              <button
                type="button"
                onClick={() => setCompositionDir("income")}
                className={cn(
                  "px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider transition-colors",
                  compositionDir === "income"
                    ? "bg-emerald-500 text-white"
                    : "bg-background text-muted-foreground hover:bg-accent"
                )}
              >
                Masuk
              </button>
            </div>
          </div>

          {compositionDir === "expense" ? (
            <div className="flex flex-col items-center gap-4">
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
                      {formatIDRCompact(summary.expenseTotal)}
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
                      <p className={cn("text-sm font-medium flex items-center justify-end gap-0.5", category.total > 0 ? "text-destructive" : "text-foreground")}>
                        {category.total > 0 && <TriangleIcon className="w-2 h-2 shrink-0 fill-current rotate-180" />}
                        {formatIDRCompact(category.total)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {category.percentage.toFixed(0)}%
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <div className="h-56 w-full max-w-[280px] rotate-[0.6deg]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={incomeCategoryData}
                      dataKey="total"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={58}
                      outerRadius={88}
                      paddingAngle={3}
                      stroke="none"
                    >
                      {incomeCategoryData.map((entry) => (
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
                      className="fill-emerald-600 dark:fill-emerald-400 text-[16px] font-semibold"
                    >
                      {formatIDRCompact(summary.incomeTotal)}
                    </text>
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="w-full space-y-2">
                {incomeCategoryData.map((category, i) => (
                  <div
                    key={category.categoryId}
                    className="flex items-center justify-between rounded-xl border border-border bg-muted/50 px-3 py-2"
                    style={{
                      transform: `rotate(${i % 2 === 0 ? 0.4 : -0.4}deg)`,
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
                      <p className={cn("text-sm font-medium flex items-center justify-end gap-0.5", category.total > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-foreground")}>
                        {category.total > 0 && <TriangleIcon className="w-2 h-2 shrink-0 fill-current" />}
                        {formatIDRCompact(category.total)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {category.percentage.toFixed(0)}%
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recent Transactions */}
      <div className="relative rounded-2xl border border-border bg-card p-4
        shadow-[2px_3px_0px_0px_rgba(0,0,0,0.06)]
        dark:shadow-[2px_3px_0px_0px_rgba(255,255,255,0.06)]">
        {/* Tape — top left */}
        <div className="absolute -top-2 left-6 h-4 w-16 bg-primary/20 border border-primary/30 rounded-sm -rotate-1 z-10" />

        <div className="flex items-center gap-2 mb-4">
          <span className="h-2 w-2 bg-primary/40 rounded-sm rotate-45" />
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Transaksi Terbaru
          </p>
        </div>

        {txStatus === "LoadingFirstPage" ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, index) => (
              <Skeleton key={index} className="h-14 rounded-xl bg-muted" />
            ))}
          </div>
        ) : recentTransactions.length === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada transaksi.</p>
        ) : (
          <div className="space-y-2">
            {recentTransactions.map((tx, i) => (
              <Link
                key={tx._id}
                href={`/transactions/${tx._id}/edit`}
                className="flex items-center gap-3 rounded-xl border border-border bg-background/60 px-3 py-2.5 transition-colors hover:bg-accent/40"
                style={{ transform: `rotate(${i % 2 === 0 ? -0.3 : 0.3}deg)` }}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-lg">
                  {tx.category?.icon ?? "📝"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {tx.category?.name ?? "Tanpa Kategori"}
                  </p>
                  <div className="mt-0.5 flex items-center gap-1.5">
                    {tx.wallet && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                        {tx.wallet.logo ? (
                          <Image
                            src={`/bank-logo/${tx.wallet.logo}`}
                            alt={tx.wallet.name}
                            width={12}
                            height={12}
                            className="h-3 w-auto object-contain"
                          />
                        ) : null}
                        {tx.wallet.label || tx.wallet.name}
                      </span>
                    )}
                    <span className="text-[10px] text-muted-foreground">
                      {format(new Date(tx.date), "d MMM", { locale: idLocale })}
                    </span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p
                    className={cn(
                      "text-sm font-bold flex items-center gap-0.5",
                      tx.amount === 0 ? "text-foreground" : tx.direction === "income" ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"
                    )}
                  >
                    {tx.amount > 0 && <TriangleIcon className={cn("w-2 h-2 shrink-0 fill-current", tx.direction === "expense" && "rotate-180")} />}
                    {formatIDR(tx.amount)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}

        <Link
          href="/transactions"
          className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-background/60 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent/40 hover:text-foreground"
        >
          Lihat Semua Transaksi
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Empty state */}
      {summary && summary.byCategory.length === 0 && summary.byIncomeCategory.length === 0 && (
        <div className="relative rounded-2xl border border-border bg-card py-12 text-center
          shadow-[2px_3px_0px_0px_rgba(0,0,0,0.06)]
          dark:shadow-[2px_3px_0px_0px_rgba(255,255,255,0.06)]">
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 h-4 w-24 bg-secondary/60 border border-primary/20 rounded-sm -rotate-1 z-10" />
          <p className="text-base font-medium text-foreground">
            Belum ada transaksi bulan ini.
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
