"use client";

import { useState, useEffect } from "react";
import { usePaginatedQuery, useQuery } from "convex/react";
import Image from "next/image";
import Link from "next/link";
import { format, startOfDay, endOfDay } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { DateRange } from "react-day-picker";
import { CalendarIcon, RotateCcw, Wallet, Plus, TriangleIcon } from "lucide-react";

import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { formatIDR } from "@/lib/currency";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

const cardCls =
  "rounded-2xl border border-border bg-card shadow-[2px_3px_0px_0px_rgba(0,0,0,0.06)] dark:shadow-[2px_3px_0px_0px_rgba(255,255,255,0.06)]";

export function WebTransactions() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [filterOpen, setFilterOpen] = useState(false);
  const wallets = useQuery(api.wallets.listWallets);
  const [selectedWalletId, setSelectedWalletId] = useState<string>(() => {
    if (typeof window !== "undefined") return sessionStorage.getItem("expenses_selectedWalletId") ?? "";
    return "";
  });
  const [directionFilter, setDirectionFilter] = useState<"all" | "expense" | "income">(() => {
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem("expenses_directionFilter");
      if (saved === "expense" || saved === "income" || saved === "all") return saved;
    }
    return "all";
  });
  const effectiveSelectedWalletId = selectedWalletId || wallets?.[0]?._id || "";

  useEffect(() => {
    sessionStorage.setItem("expenses_selectedWalletId", selectedWalletId);
  }, [selectedWalletId]);
  useEffect(() => {
    sessionStorage.setItem("expenses_directionFilter", directionFilter);
  }, [directionFilter]);

  const { results, status, loadMore } = usePaginatedQuery(
    api.transactions.listTransactions,
    {
      startDate: dateRange?.from ? startOfDay(dateRange.from).getTime() : undefined,
      endDate: dateRange?.to ? endOfDay(dateRange.to).getTime() : undefined,
      walletId: effectiveSelectedWalletId ? (effectiveSelectedWalletId as Id<"wallets">) : undefined,
      direction: directionFilter === "all" ? undefined : directionFilter,
    },
    { initialNumItems: 30 }
  );

  const hasDateFilter = Boolean(dateRange?.from || dateRange?.to);

  function getDateFilterLabel() {
    if (dateRange?.from && dateRange?.to)
      return `${format(dateRange.from, "d MMM yyyy", { locale: idLocale })} – ${format(dateRange.to, "d MMM yyyy", { locale: idLocale })}`;
    if (dateRange?.from) return `Dari ${format(dateRange.from, "d MMM yyyy", { locale: idLocale })}`;
    if (dateRange?.to) return `Sampai ${format(dateRange.to, "d MMM yyyy", { locale: idLocale })}`;
    return "Semua tanggal";
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="inline-block -rotate-1 rounded-md bg-primary px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-primary-foreground">
            Transaksi
          </span>
          <h1 className="text-2xl font-bold text-card-foreground">Semua Transaksi</h1>
        </div>
        <Link
          href="/transactions/new"
          className="flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition-all hover:bg-primary/90 active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" />
          Tambah
        </Link>
      </div>

      {/* Filter toolbar */}
      <div className={cn(cardCls, "flex flex-wrap items-center gap-3 p-4")}>
        <div className="flex gap-2">
          {[
            { value: "all", label: "Semua" },
            { value: "expense", label: "Pengeluaran" },
            { value: "income", label: "Pemasukan" },
          ].map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setDirectionFilter(item.value as typeof directionFilter)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-150",
                directionFilter === item.value
                  ? "border-transparent bg-primary text-primary-foreground"
                  : "border-border bg-background text-muted-foreground hover:border-primary/30"
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="h-6 w-px bg-border" />

        {wallets && wallets.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {wallets.map((wallet) => {
              const active = effectiveSelectedWalletId === wallet._id;
              return (
                <button
                  key={wallet._id}
                  type="button"
                  onClick={() => setSelectedWalletId(active ? "" : wallet._id)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-150",
                    active
                      ? "border-transparent bg-primary text-primary-foreground"
                      : "border-border bg-background text-muted-foreground hover:border-primary/30"
                  )}
                >
                  {wallet.logo ? (
                    <Image src={`/bank-logo/${wallet.logo}`} alt={wallet.name} width={16} height={16} className="h-3.5 w-3.5 object-contain" />
                  ) : (
                    <Wallet className="h-3 w-3" />
                  )}
                  {wallet.label || wallet.name}
                </button>
              );
            })}
          </div>
        )}

        <div className="ml-auto flex items-center gap-2">
          {hasDateFilter && (
            <button
              type="button"
              onClick={() => setDateRange(undefined)}
              className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </button>
          )}
          <Popover open={filterOpen} onOpenChange={setFilterOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={cn(
                  "flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors",
                  hasDateFilter
                    ? "border-primary/40 bg-primary/10 text-foreground"
                    : "border-border bg-background/70 text-foreground hover:border-primary/30"
                )}
              >
                <CalendarIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="truncate">{getDateFilterLabel()}</span>
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-auto border-border bg-popover p-0 text-popover-foreground">
              <Calendar
                mode="range"
                min={1}
                selected={dateRange}
                onSelect={(range) => {
                  setDateRange(range);
                  if (range?.from && range?.to) setFilterOpen(false);
                }}
                locale={idLocale}
                numberOfMonths={2}
                className="bg-popover"
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Table */}
      {status === "LoadingFirstPage" ? (
        <div className="space-y-3">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-12 rounded-xl bg-muted" />
          ))}
        </div>
      ) : results.length === 0 ? (
        <div className={cn(cardCls, "py-16 text-center")}>
          <p className="text-base font-medium text-foreground">
            {hasDateFilter
              ? "Tidak ada transaksi pada rentang tanggal ini."
              : selectedWalletId
                ? "Belum ada transaksi di wallet ini."
                : "Belum ada transaksi."}
          </p>
        </div>
      ) : (
        <div className={cn(cardCls, "overflow-hidden")}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <th className="px-5 py-3 font-medium">Tanggal</th>
                <th className="px-5 py-3 font-medium">Deskripsi</th>
                <th className="px-5 py-3 font-medium">Kategori</th>
                <th className="px-5 py-3 font-medium">Wallet</th>
                <th className="px-5 py-3 text-right font-medium">Jumlah</th>
              </tr>
            </thead>
            <tbody>
              {results.map((tx) => {
                const isExpense = tx.direction === "expense";
                return (
                  <tr key={tx._id} className="group border-b border-border/60 transition-colors last:border-0 hover:bg-accent/40">
                    <td className="px-5 py-3 align-middle">
                      <Link href={`/transactions/${tx._id}/edit`} className="block whitespace-nowrap text-muted-foreground">
                        {format(new Date(tx.date), "d MMM yyyy", { locale: idLocale })}
                      </Link>
                    </td>
                    <td className="max-w-0 px-5 py-3 align-middle">
                      <Link href={`/transactions/${tx._id}/edit`} className="flex items-center gap-2">
                        {tx.category?.icon && <span className="shrink-0 text-base leading-none">{tx.category.icon}</span>}
                        <span className="truncate font-medium text-card-foreground">{tx.description}</span>
                        {tx.vendor && <span className="shrink-0 text-xs text-muted-foreground">· {tx.vendor.name}</span>}
                      </Link>
                    </td>
                    <td className="px-5 py-3 align-middle">
                      {tx.category ? (
                        <span
                          className="inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs"
                          style={{
                            backgroundColor: (tx.category.color ?? "#3b82f6") + "33",
                            color: tx.category.color ?? "#3b82f6",
                          }}
                        >
                          {tx.category.name}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3 align-middle">
                      {tx.wallet ? (
                        <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs text-muted-foreground">
                          {tx.wallet.logo && (
                            <Image src={`/bank-logo/${tx.wallet.logo}`} alt={tx.wallet.name} width={14} height={14} className="h-3.5 w-auto object-contain" />
                          )}
                          {tx.wallet.label || tx.wallet.name}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right align-middle">
                      <Link
                        href={`/transactions/${tx._id}/edit`}
                        className={cn(
                          "inline-flex items-center justify-end gap-0.5 whitespace-nowrap font-bold",
                          tx.amount === 0 ? "text-card-foreground" : isExpense ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"
                        )}
                      >
                        {tx.amount > 0 && <TriangleIcon className={cn("h-2 w-2 shrink-0 fill-current", isExpense && "rotate-180")} />}
                        {formatIDR(tx.amount)}
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {status === "CanLoadMore" && (
        <Button variant="outline" className="w-full rounded-2xl border-border" onClick={() => loadMore(30)}>
          Muat lebih banyak
        </Button>
      )}
    </div>
  );
}
