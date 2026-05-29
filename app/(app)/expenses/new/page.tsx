import { ExpenseForm } from "@/components/expenses/ExpenseForm";

export const dynamic = "force-dynamic";

export default function NewExpensePage() {
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
            Tambah
          </span>
          <span className="text-sm text-muted-foreground font-medium">
            Pengeluaran Baru
          </span>
        </div>
        <ExpenseForm />
      </div>
    </div>
  );
}
