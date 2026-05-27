"use client";

import { usePaginatedQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ExpenseCard } from "@/components/expenses/ExpenseCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

export default function ExpensesPage() {
  const { results, status, loadMore } = usePaginatedQuery(
    api.expenses.listExpenses,
    {},
    { initialNumItems: 20 }
  );

  return (
    <div className="p-4 max-w-lg mx-auto space-y-4">
      <div className="pt-4">
        <h1 className="text-xl font-semibold text-zinc-50">Pengeluaran</h1>
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
          <p>Belum ada pengeluaran.</p>
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
