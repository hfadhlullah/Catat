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
      <div className="min-h-screen pb-24">
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
    <div className="min-h-screen pb-24">
      <div className="p-4 max-w-lg mx-auto">
        <div className="pt-4 mb-4">
          <h1 className="text-xl font-semibold text-foreground">Edit Pengeluaran</h1>
          <p className="mt-1 text-sm text-muted-foreground">Ubah detail pengeluaran dan ganti foto nota jika diperlukan.</p>
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
