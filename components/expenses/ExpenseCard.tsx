import { formatIDR } from "@/lib/currency";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import Image from "next/image";

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
  return (
    <div className="bg-zinc-900 rounded-2xl p-4 border border-zinc-800 flex gap-3">
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
        <a href={expense.receiptUrl} target="_blank" rel="noopener noreferrer" className="shrink-0">
          <Image
            src={expense.receiptUrl}
            alt="receipt"
            width={56}
            height={56}
            className="w-14 h-14 object-cover rounded-lg border border-zinc-700"
          />
        </a>
      )}
    </div>
  );
}
