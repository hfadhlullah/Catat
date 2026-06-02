"use client";

import { useState } from "react";
import { useQuery, useMutation, usePaginatedQuery } from "convex/react";
import Image from "next/image";
import Link from "next/link";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import {
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from "recharts";
import { UserPlus, Check, X, ArrowRight, TriangleIcon } from "lucide-react";
import { toast } from "sonner";

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

function CompositionPie({
  title,
  data,
  total,
  accent,
}: {
  title: string;
  data: Array<{ categoryId: string; name: string; total: number; color: string; percentage: number }>;
  total: number;
  accent: "expense" | "income";
}) {
  if (data.length === 0) {
    return (
      <div className={cn(cardCls, "flex flex-col p-5")}>
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{title}</p>
        <div className="flex flex-1 items-center justify-center py-10 text-sm text-muted-foreground">
          Belum ada data.
        </div>
      </div>
    );
  }
  return (
    <div className={cn(cardCls, "p-5")}>
      <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">{title}</p>
      <div className="flex items-center gap-4">
        <div className="h-44 w-44 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="total"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={78}
                paddingAngle={3}
                stroke="none"
              >
                {data.map((entry) => (
                  <Cell key={entry.categoryId} fill={entry.color} stroke="var(--card)" strokeWidth={3} />
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
              />
              <text x="50%" y="46%" textAnchor="middle" dominantBaseline="middle" className="fill-muted-foreground text-[11px]">
                Total
              </text>
              <text
                x="50%"
                y="56%"
                textAnchor="middle"
                dominantBaseline="middle"
                className={cn(
                  "text-[14px] font-semibold",
                  accent === "expense" ? "fill-card-foreground" : "fill-emerald-600 dark:fill-emerald-400"
                )}
              >
                {formatIDRCompact(total)}
              </text>
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="min-w-0 flex-1 space-y-1.5">
          {data.slice(0, 6).map((category) => (
            <div key={category.categoryId} className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: category.color }} />
                <span className="truncate text-sm text-foreground">{category.name}</span>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="text-sm font-medium text-foreground">{formatIDRCompact(category.total)}</span>
                <span className="w-9 text-right text-xs text-muted-foreground">{category.percentage.toFixed(0)}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function WebDashboard() {
  const period = format(new Date(), "yyyy-MM");
  const monthName = format(new Date(), "MMMM yyyy", { locale: idLocale });
  const userProfile = useQuery(api.users.getCurrentUserProfile);
  const walletOverview = useQuery(api.wallets.getWalletOverview, { period });
  const [selectedWalletId, setSelectedWalletId] = useState<string>("");
  const effectiveSelectedWalletId = selectedWalletId || walletOverview?.wallets[0]?._id || "";

  const summary = useQuery(api.transactions.getTransactionSummary, {
    period,
    walletId: effectiveSelectedWalletId ? (effectiveSelectedWalletId as Id<"wallets">) : undefined,
  });

  const { results: recentTransactions, status: txStatus } = usePaginatedQuery(
    api.transactions.listTransactions,
    { walletId: effectiveSelectedWalletId ? (effectiveSelectedWalletId as Id<"wallets">) : undefined },
    { initialNumItems: 8 }
  );

  const pendingInvites = useQuery(api.walletSharing.listPendingInvites);
  const acceptInvite = useMutation(api.walletSharing.acceptInvite);
  const rejectInvite = useMutation(api.walletSharing.rejectInvite);
  const [processingInviteId, setProcessingInviteId] = useState<string | null>(null);

  const selectedWallet =
    walletOverview?.wallets.find((wallet) => wallet._id === effectiveSelectedWalletId) ??
    walletOverview?.wallets[0];

  const categoryData = [...(summary?.byCategory ?? [])]
    .sort((a, b) => b.total - a.total)
    .map((category, index) => ({
      ...category,
      color: category.color ?? COLORS[index % COLORS.length],
      percentage: summary && summary.expenseTotal > 0 ? (category.total / summary.expenseTotal) * 100 : 0,
    }));

  const incomeCategoryData = [...(summary?.byIncomeCategory ?? [])]
    .sort((a, b) => b.total - a.total)
    .map((category, index) => ({
      ...category,
      color: category.color ?? COLORS[(index + 3) % COLORS.length],
      percentage: summary && summary.incomeTotal > 0 ? (category.total / summary.incomeTotal) * 100 : 0,
    }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-3xl font-bold text-card-foreground">
            Hi there, <span className="font-extrabold">{userProfile?.name ?? "…"}</span>
          </p>
          <div className="mt-2 flex items-center gap-2">
            <span className="inline-block -rotate-1 rounded-md bg-primary px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-primary-foreground">
              Dashboard
            </span>
            <span className="text-sm font-medium text-muted-foreground">{monthName}</span>
          </div>
        </div>

        {walletOverview && walletOverview.wallets.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {walletOverview.wallets.map((wallet) => {
              const active = selectedWallet?._id === wallet._id;
              return (
                <button
                  key={wallet._id}
                  type="button"
                  onClick={() => setSelectedWalletId(wallet._id)}
                  className={cn(
                    "flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-medium transition-all duration-150",
                    active
                      ? "border-transparent bg-primary text-primary-foreground"
                      : "border-border bg-card text-muted-foreground hover:border-primary/30"
                  )}
                >
                  {wallet.logo && (
                    <Image src={`/bank-logo/${wallet.logo}`} alt={wallet.name} width={16} height={16} className="h-4 w-auto object-contain" />
                  )}
                  {wallet.label || wallet.name}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Pending invites */}
      {pendingInvites && pendingInvites.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-2">
          {pendingInvites.map((invite) => (
            <div key={invite._id} className={cn(cardCls, "p-4")}>
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

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className={cn(cardCls, "p-5")}>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Pengeluaran</p>
          {summary === undefined ? (
            <Skeleton className="mt-2 h-9 w-full bg-muted" />
          ) : (
            <p className={cn("mt-2 flex items-center gap-1 text-2xl font-semibold tracking-tight", summary.expenseTotal > 0 ? "text-destructive" : "text-card-foreground")}>
              {summary.expenseTotal > 0 && <TriangleIcon className="h-3 w-3 shrink-0 rotate-180 fill-current" />}
              {formatIDRCompact(summary.expenseTotal)}
            </p>
          )}
          <p className="mt-1 text-xs text-muted-foreground">{summary?.expenseCount ?? "–"} transaksi</p>
        </div>

        <div className={cn(cardCls, "p-5")}>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Pemasukan</p>
          {summary === undefined ? (
            <Skeleton className="mt-2 h-9 w-full bg-muted" />
          ) : (
            <p className={cn("mt-2 flex items-center gap-1 text-2xl font-semibold tracking-tight", summary.incomeTotal > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-card-foreground")}>
              {summary.incomeTotal > 0 && <TriangleIcon className="h-3 w-3 shrink-0 fill-current" />}
              {formatIDRCompact(summary.incomeTotal)}
            </p>
          )}
          <p className="mt-1 text-xs text-muted-foreground">{summary?.incomeCount ?? "–"} transaksi</p>
        </div>

        <div className={cn(cardCls, "p-5")}>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Net</p>
          {summary === undefined ? (
            <Skeleton className="mt-2 h-9 w-full bg-muted" />
          ) : (
            <p className="mt-2 text-2xl font-semibold tracking-tight text-card-foreground">{formatIDRCompact(summary.net)}</p>
          )}
          <p className="mt-1 text-xs text-muted-foreground">{summary?.count ?? "–"} total transaksi</p>
        </div>

        <div className={cn(cardCls, "p-5")}>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Saldo Wallet</p>
          {selectedWallet ? (
            <>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-card-foreground">{formatIDRCompact(selectedWallet.balance)}</p>
              <p className="mt-1 truncate text-xs text-muted-foreground">
                {selectedWallet.budgetAmount > 0 ? `Budget sisa ${formatIDRCompact(selectedWallet.budgetRemaining)}` : selectedWallet.label || selectedWallet.name}
              </p>
            </>
          ) : (
            <Skeleton className="mt-2 h-9 w-full bg-muted" />
          )}
        </div>
      </div>

      {/* Main grid: composition + recent */}
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          {summary === undefined ? (
            <div className={cn(cardCls, "p-5")}>
              <Skeleton className="h-44 w-full bg-muted" />
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-2">
              <CompositionPie title="Komposisi Pengeluaran" data={categoryData} total={summary.expenseTotal} accent="expense" />
              <CompositionPie title="Komposisi Pemasukan" data={incomeCategoryData} total={summary.incomeTotal} accent="income" />
            </div>
          )}

          <Link
            href="/reports"
            className={cn(cardCls, "flex h-14 w-full items-center justify-center gap-2 text-sm font-medium text-foreground transition-colors hover:bg-accent")}
          >
            View Detail Report
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Recent transactions */}
        <div className={cn(cardCls, "flex flex-col p-5")}>
          <div className="mb-4 flex items-center gap-2">
            <span className="h-2 w-2 rotate-45 rounded-sm bg-primary/40" />
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Transaksi Terbaru</p>
          </div>

          {txStatus === "LoadingFirstPage" ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, index) => (
                <Skeleton key={index} className="h-14 rounded-xl bg-muted" />
              ))}
            </div>
          ) : recentTransactions.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada transaksi.</p>
          ) : (
            <div className="space-y-2">
              {recentTransactions.map((tx) => (
                <Link
                  key={tx._id}
                  href={`/transactions/${tx._id}/edit`}
                  className="flex items-center gap-3 rounded-xl border border-border bg-background/60 px-3 py-2.5 transition-colors hover:bg-accent/40"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-lg">
                    {tx.category?.icon ?? "📝"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{tx.category?.name ?? "Tanpa Kategori"}</p>
                    <div className="mt-0.5 flex items-center gap-1.5">
                      {tx.wallet && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                          {tx.wallet.logo ? (
                            <Image src={`/bank-logo/${tx.wallet.logo}`} alt={tx.wallet.name} width={12} height={12} className="h-3 w-auto object-contain" />
                          ) : null}
                          {tx.wallet.label || tx.wallet.name}
                        </span>
                      )}
                      <span className="text-[10px] text-muted-foreground">{format(new Date(tx.date), "d MMM", { locale: idLocale })}</span>
                    </div>
                  </div>
                  <p
                    className={cn(
                      "flex shrink-0 items-center gap-0.5 text-sm font-bold",
                      tx.amount === 0 ? "text-foreground" : tx.direction === "income" ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"
                    )}
                  >
                    {tx.amount > 0 && <TriangleIcon className={cn("h-2 w-2 shrink-0 fill-current", tx.direction === "expense" && "rotate-180")} />}
                    {formatIDR(tx.amount)}
                  </p>
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
      </div>
    </div>
  );
}
