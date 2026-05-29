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
        <h1 className="text-xl font-semibold text-foreground">Pengeluaran</h1>
      </div>

      <div className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Filter tanggal</p>
            <p className="mt-1 text-sm text-card-foreground">{getDateFilterLabel()}</p>
          </div>
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
        </div>

        <Popover open={filterOpen} onOpenChange={handleFilterOpenChange}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={cn(
                "flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left text-sm transition-colors",
                hasDateFilter
                  ? "border-primary/40 bg-primary/10 text-foreground"
                  : "border-border bg-background/70 text-foreground hover:border-primary/30"
              )}
            >
              <span className="truncate">{getDateFilterLabel()}</span>
              <CalendarIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-auto border-border bg-popover p-0 text-popover-foreground">
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
              className="bg-popover"
            />
          </PopoverContent>
        </Popover>
      </div>

      {status === "LoadingFirstPage" && (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-2xl bg-muted" />
          ))}
        </div>
      )}

      {results.length === 0 && status !== "LoadingFirstPage" && (
        <div className="py-12 text-center text-muted-foreground">
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
          className="w-full"
          onClick={() => loadMore(20)}
        >
          Muat lebih banyak
        </Button>
      )}
    </div>
  );
}
