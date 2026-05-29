"use client";

import { use } from "react";
import { useQuery } from "convex/react";

import { ExpenseForm } from "@/components/expenses/ExpenseForm";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

export const dynamic = "force-dynamic";

export default function EditExpensePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const expense = useQuery(api.expenses.getExpenseById, { id: id as Id<"expenses"> });

  if (expense === undefined) {
    return (
      <div className="relative min-h-screen pb-24">
        {/* Paper texture */}
        <div
          className="fixed inset-0 -z-10
            bg-[#faf9f6] dark:bg-[#0f172a]
            bg-[radial-gradient(#e2e0d8_1px,transparent_1px)]
            dark:bg-[radial-gradient(#1e293b_1px,transparent_1px)]
            [background-size:32px_32px] opacity-60 dark:opacity-40"
          aria-hidden="true"
        />

        <div className="p-4 max-w-lg mx-auto space-y-4">
          <div className="pt-4 space-y-2">
            <Skeleton className="h-7 w-40 rounded-lg bg-muted" />
            <Skeleton className="h-4 w-56 rounded-lg bg-muted" />
          </div>
          <Skeleton className="h-32 rounded-2xl bg-muted" />
          <Skeleton className="h-64 rounded-2xl bg-muted" />
          <Skeleton className="h-48 rounded-2xl bg-muted" />
          <Skeleton className="h-14 rounded-2xl bg-muted" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen pb-24">
      {/* Paper texture */}
      <div
        className="fixed inset-0 -z-10
          bg-[#faf9f6] dark:bg-[#0f172a]
          bg-[radial-gradient(#e2e0d8_1px,transparent_1px)]
          dark:bg-[radial-gradient(#1e293b_1px,transparent_1px)]
          [background-size:32px_32px] opacity-60 dark:opacity-40"
        aria-hidden="true"
      />

      <div className="p-4 max-w-lg mx-auto">
        <div className="pt-4 mb-5 flex items-center gap-2">
          <span className="inline-block -rotate-1 bg-primary text-primary-foreground px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest rounded-md">
            Edit
          </span>
          <span className="text-sm text-muted-foreground font-medium">
            Pengeluaran
          </span>
        </div>
        <ExpenseForm
          mode="edit"
          expenseId={expense._id}
          initialExpense={expense}
        />
      </div>
    </div>
  );
}
