"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import Link from "next/link";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { formatIDR } from "@/lib/currency";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import Image from "next/image";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface ExpenseCardProps {
  expense: {
    _id: string;
    amount: number;
    installmentCount?: number;
    installmentRate?: number;
    description: string;
    date: number;
    notes?: string;
    category?: { name: string; color?: string; icon?: string } | null;
    wallet?: { name: string } | null;
    vendor?: { name: string } | null;
    receiptUrl?: string | null;
  };
}

export function ExpenseCard({ expense }: ExpenseCardProps) {
  const deleteExpense = useMutation(api.expenses.deleteExpense);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const installmentCount = expense.installmentCount ?? 1;
  const installmentRate = expense.installmentRate ?? 0;
  const totalWithInterest = Math.round(expense.amount * (1 + installmentRate / 100));
  const perInstallment = installmentCount > 0 ? Math.round(totalWithInterest / installmentCount) : totalWithInterest;

  async function handleDelete() {
    if (!confirming) {
      setConfirming(true);
      setTimeout(() => setConfirming(false), 3000);
      return;
    }
    setDeleting(true);
    try {
      await deleteExpense({ id: expense._id as Id<"expenses"> });
      toast.success("Pengeluaran dihapus");
    } catch {
      toast.error("Gagal menghapus");
      setDeleting(false);
    }
  }

  return (
    <div className={cn(
      "relative rounded-2xl border border-border bg-card transition-opacity shadow-[2px_3px_0px_0px_rgba(0,0,0,0.06)] dark:shadow-[2px_3px_0px_0px_rgba(255,255,255,0.06)]",
      deleting && "pointer-events-none opacity-40"
    )}>
      <div className="p-4 flex gap-3">
        {expense.category?.icon && (
          <div className="text-2xl leading-none mt-0.5">{expense.category.icon}</div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="truncate font-medium text-card-foreground">{expense.description}</p>
            <p className="shrink-0 font-semibold text-card-foreground">{formatIDR(expense.amount)}</p>
          </div>
          <div className="flex gap-2 mt-1 flex-wrap">
            {expense.category && (
              <span
                className="text-xs px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: (expense.category.color ?? "#3b82f6") + "33",
                  color: expense.category.color ?? "#3b82f6",
                }}
              >
                {expense.category.name}
              </span>
            )}
            {expense.vendor && (
              <span className="text-xs text-muted-foreground">{expense.vendor.name}</span>
            )}
            {expense.wallet && (
              <span className="text-xs text-muted-foreground">{expense.wallet.name}</span>
            )}
            {installmentCount > 1 && (
              <span className="text-xs text-muted-foreground">
                {installmentCount}x • {installmentRate}% • {formatIDR(perInstallment)}/cicilan
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {format(new Date(expense.date), "d MMM yyyy", { locale: idLocale })}
          </p>
        </div>
        {expense.receiptUrl && (
          <Dialog>
            <DialogTrigger asChild>
              <button type="button" className="shrink-0">
                <Image
                  src={expense.receiptUrl}
                  alt={`Nota untuk ${expense.description}`}
                  width={56}
                  height={56}
                  className="h-14 w-14 rounded-lg border border-border object-cover"
                />
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-[min(92vw,40rem)] border-border bg-popover p-3 text-popover-foreground sm:rounded-2xl">
              <DialogTitle className="sr-only">Preview nota</DialogTitle>
              <DialogDescription className="sr-only">
                Preview gambar nota untuk {expense.description}
              </DialogDescription>
              <div className="overflow-hidden rounded-xl border border-border bg-card">
                <Image
                  src={expense.receiptUrl}
                  alt={`Nota untuk ${expense.description}`}
                  width={1200}
                  height={1200}
                  className="h-auto max-h-[80vh] w-full object-contain"
                />
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="px-4 pb-3 flex justify-end gap-2">
        <Link
          href={`/expenses/${expense._id}/edit`}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-muted-foreground transition-all duration-150 hover:bg-accent hover:text-foreground"
        >
          <Pencil className="w-3.5 h-3.5" />
          Edit
        </Link>
        <button
          onClick={handleDelete}
          className={cn(
            "flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all duration-150",
            confirming
              ? "border border-destructive/40 bg-destructive/10 text-destructive"
              : "text-muted-foreground hover:bg-accent hover:text-destructive"
          )}
        >
          <Trash2 className="w-3.5 h-3.5" />
          {confirming ? "Yakin hapus?" : "Hapus"}
        </button>
      </div>
    </div>
  );
}
