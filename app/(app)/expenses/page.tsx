"use client";

import { useState } from "react";
import { usePaginatedQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ExpenseCard } from "@/components/expenses/ExpenseCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, RotateCcw } from "lucide-react";
import { format, startOfDay, endOfDay } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { DateRange } from "react-day-picker";

import { cn } from "@/lib/utils";

export default function ExpensesPage() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [filterOpen, setFilterOpen] = useState(false);

  const { results, status, loadMore } = usePaginatedQuery(
    api.expenses.listExpenses,
    {
      startDate: dateRange?.from ? startOfDay(dateRange.from).getTime() : undefined,
      endDate: dateRange?.to ? endOfDay(dateRange.to).getTime() : undefined,
    },
    { initialNumItems: 20 }
  );

  const hasDateFilter = Boolean(dateRange?.from || dateRange?.to);

  function getDateFilterLabel() {
    if (dateRange?.from && dateRange?.to) {
      return `${format(dateRange.from, "d MMM yyyy", { locale: idLocale })} - ${format(dateRange.to, "d MMM yyyy", { locale: idLocale })}`;
    }

    if (dateRange?.from) {
      return `Dari ${format(dateRange.from, "d MMM yyyy", { locale: idLocale })}`;
    }

    if (dateRange?.to) {
      return `Sampai ${format(dateRange.to, "d MMM yyyy", { locale: idLocale })}`;
    }

    return "Semua tanggal";
  }

  function handleFilterOpenChange(nextOpen: boolean) {
    if (!nextOpen && dateRange?.from && !dateRange?.to) {
      return;
    }

    setFilterOpen(nextOpen);
  }

  return (
    <div className="p-4 max-w-lg mx-auto space-y-4">
      <div className="pt-4">
        <h1 className="text-xl font-semibold text-zinc-50">Pengeluaran</h1>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-zinc-500">Filter tanggal</p>
            <p className="mt-1 text-sm text-zinc-300">{getDateFilterLabel()}</p>
          </div>
          {hasDateFilter && (
            <button
              type="button"
              onClick={() => setDateRange(undefined)}
              className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </button>
          )}
        </div>

        <Popover open={filterOpen} onOpenChange={handleFilterOpenChange}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={cn(
                "flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left text-sm transition-colors",
                hasDateFilter
                  ? "border-blue-500/40 bg-blue-500/10 text-zinc-50"
                  : "border-zinc-800 bg-zinc-950/40 text-zinc-300 hover:border-zinc-700"
              )}
            >
              <span className="truncate">{getDateFilterLabel()}</span>
              <CalendarIcon className="h-4 w-4 shrink-0 text-zinc-400" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-auto border-zinc-800 bg-zinc-950 p-0 text-zinc-50">
            <Calendar
              mode="range"
              min={1}
              selected={dateRange}
              onSelect={(range) => {
                setDateRange(range);
                if (range?.from && range?.to) setFilterOpen(false);
              }}
              locale={idLocale}
              numberOfMonths={1}
              className="bg-zinc-950"
            />
          </PopoverContent>
        </Popover>
      </div>

      {status === "LoadingFirstPage" && (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-2xl bg-zinc-800" />
          ))}
        </div>
      )}

      {results.length === 0 && status !== "LoadingFirstPage" && (
        <div className="text-center py-12 text-zinc-500">
          <p>{hasDateFilter ? "Tidak ada pengeluaran pada rentang tanggal ini." : "Belum ada pengeluaran."}</p>
        </div>
      )}

      <div className="space-y-3">
        {results.map((expense) => (
          <ExpenseCard key={expense._id} expense={expense} />
        ))}
      </div>

      {status === "CanLoadMore" && (
        <Button
          variant="outline"
          className="w-full border-zinc-700 text-zinc-300"
          onClick={() => loadMore(20)}
        >
          Muat lebih banyak
        </Button>
      )}
    </div>
  );
}
