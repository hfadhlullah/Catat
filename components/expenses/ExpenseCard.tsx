"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { formatIDR } from "@/lib/currency";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import Image from "next/image";
import { Trash2 } from "lucide-react";
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
    description: string;
    date: number;
    notes?: string;
    category?: { name: string; color?: string; icon?: string } | null;
    vendor?: { name: string } | null;
    receiptUrl?: string | null;
  };
}

export function ExpenseCard({ expense }: ExpenseCardProps) {
  const deleteExpense = useMutation(api.expenses.deleteExpense);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

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
    <div className={cn("bg-zinc-900 rounded-2xl border border-zinc-800 transition-opacity", deleting && "opacity-40 pointer-events-none")}>
      <div className="p-4 flex gap-3">
        {expense.category?.icon && (
          <div className="text-2xl leading-none mt-0.5">{expense.category.icon}</div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="text-zinc-50 font-medium truncate">{expense.description}</p>
            <p className="text-zinc-50 font-semibold shrink-0">{formatIDR(expense.amount)}</p>
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
              <span className="text-xs text-zinc-400">{expense.vendor.name}</span>
            )}
          </div>
          <p className="text-zinc-500 text-xs mt-1">
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
                  className="h-14 w-14 rounded-lg border border-zinc-700 object-cover"
                />
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-[min(92vw,40rem)] border-zinc-800 bg-zinc-950 p-3 text-zinc-50 sm:rounded-2xl">
              <DialogTitle className="sr-only">Preview nota</DialogTitle>
              <DialogDescription className="sr-only">
                Preview gambar nota untuk {expense.description}
              </DialogDescription>
              <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
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

      <div className="px-4 pb-3 flex justify-end">
        <button
          onClick={handleDelete}
          className={cn(
            "flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all duration-150",
            confirming
              ? "bg-red-600/20 text-red-400 border border-red-600/40"
              : "text-zinc-600 hover:text-red-400 hover:bg-zinc-800"
          )}
        >
          <Trash2 className="w-3.5 h-3.5" />
          {confirming ? "Yakin hapus?" : "Hapus"}
        </button>
      </div>
    </div>
  );
}
