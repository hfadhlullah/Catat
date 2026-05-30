"use client";

import Link from "next/link";
import { formatIDR } from "@/lib/currency";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import Image from "next/image";
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
    direction: "expense" | "income";
    transactionType?: string;
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
    submitterName?: string;
    isOwn?: boolean;
    splitBill?: {
      enabled: boolean;
      mode: "equal" | "custom";
      participants: Array<{
        userId?: string;
        name: string;
        amount: number;
        isPaid?: boolean;
      }>;
    };
  };
}

function CardContent({ expense: transaction }: { expense: ExpenseCardProps["expense"] }) {
  const installmentCount = transaction.installmentCount ?? 1;
  const installmentRate = transaction.installmentRate ?? 0;
  const totalWithInterest = Math.round(transaction.amount * (1 + installmentRate / 100));
  const perInstallment = installmentCount > 0 ? Math.round(totalWithInterest / installmentCount) : totalWithInterest;
  const isExpense = transaction.direction === "expense";
  const canEdit = transaction.isOwn !== false;
  const splitParticipantCount = transaction.splitBill?.participants.length ?? 0;
  const splitPaidCount = transaction.splitBill?.participants.filter((participant) => participant.isPaid).length ?? 0;

  return (
    <div className={cn(
      "p-4 flex gap-3",
      !canEdit && "opacity-80"
    )}>
      {transaction.category?.icon && (
        <div className="text-2xl leading-none mt-0.5">{transaction.category.icon}</div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="truncate font-medium text-card-foreground">{transaction.description}</p>
          <p className={cn("shrink-0 font-semibold", isExpense ? "text-card-foreground" : "text-emerald-600 dark:text-emerald-400")}>
            {isExpense ? "-" : "+"}{formatIDR(transaction.amount)}
          </p>
        </div>
        <div className="flex gap-2 mt-1 flex-wrap">
          <span className={cn(
            "text-xs px-2 py-0.5 rounded-full",
            isExpense ? "bg-destructive/10 text-destructive" : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          )}>
            {isExpense ? "Pengeluaran" : "Pemasukan"}
          </span>
          {transaction.transactionType && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground capitalize">
              {transaction.transactionType}
            </span>
          )}
          {transaction.category && (
            <span
              className="text-xs px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: (transaction.category.color ?? "#3b82f6") + "33",
                color: transaction.category.color ?? "#3b82f6",
              }}
            >
              {transaction.category.name}
            </span>
          )}
          {transaction.vendor && (
            <span className="text-xs text-muted-foreground">{transaction.vendor.name}</span>
          )}
          {transaction.wallet && (
            <span className="text-xs text-muted-foreground">{transaction.wallet.name}</span>
          )}
          {transaction.submitterName && transaction.isOwn === false && (
            <span className="text-xs font-medium text-primary">Dibuat oleh {transaction.submitterName}</span>
          )}
          {isExpense && installmentCount > 1 && (
            <span className="text-xs text-muted-foreground">
              {installmentCount}x • {installmentRate}% • {formatIDR(perInstallment)}/cicilan
            </span>
          )}
          {transaction.splitBill?.enabled && splitParticipantCount > 0 && (
            <span className="text-xs text-muted-foreground">
              Split {splitParticipantCount} orang{splitParticipantCount > 0 ? ` • ${splitPaidCount}/${splitParticipantCount} paid` : ""}
            </span>
          )}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {format(new Date(transaction.date), "d MMM yyyy", { locale: idLocale })}
        </p>
      </div>
      {transaction.receiptUrl && (
        <Dialog>
          <DialogTrigger asChild>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              className="shrink-0"
            >
              <Image
                src={transaction.receiptUrl}
                alt={`Lampiran untuk ${transaction.description}`}
                width={56}
                height={56}
                className="h-14 w-14 rounded-lg border border-border object-cover"
              />
            </button>
          </DialogTrigger>
            <DialogContent className="max-w-[min(92vw,40rem)] border-border bg-popover p-3 text-popover-foreground sm:rounded-2xl">
              <DialogTitle className="sr-only">Preview lampiran</DialogTitle>
              <DialogDescription className="sr-only">
                Preview gambar lampiran untuk {transaction.description}
              </DialogDescription>
              <div className="overflow-hidden rounded-xl border border-border bg-card">
                <Image
                  src={transaction.receiptUrl}
                  alt={`Lampiran untuk ${transaction.description}`}
                  width={1200}
                  height={1200}
                  className="h-auto max-h-[80vh] w-full object-contain"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

export function ExpenseCard({ expense }: ExpenseCardProps) {
  const canEdit = expense.isOwn !== false;

  if (!canEdit) {
    return (
      <div className={cn(
        "relative rounded-2xl border border-border bg-card shadow-[2px_3px_0px_0px_rgba(0,0,0,0.06)] dark:shadow-[2px_3px_0px_0px_rgba(255,255,255,0.06)]"
      )}>
        <CardContent expense={expense} />
      </div>
    );
  }

  return (
    <Link
      href={`/expenses/${expense._id}/edit`}
      className={cn(
        "block relative rounded-2xl border border-border bg-card transition-opacity shadow-[2px_3px_0px_0px_rgba(0,0,0,0.06)] dark:shadow-[2px_3px_0px_0px_rgba(255,255,255,0.06)]"
      )}
    >
      <CardContent expense={expense} />
    </Link>
  );
}
