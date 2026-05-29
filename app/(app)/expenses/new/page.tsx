import { ExpenseForm } from "@/components/expenses/ExpenseForm";

export const dynamic = "force-dynamic";

export default function NewExpensePage() {
  return (
    <div className="min-h-screen pb-24">
      <div className="p-4 max-w-lg mx-auto">
        <div className="pt-4 mb-4">
          <h1 className="text-xl font-semibold text-foreground">Tambah Pengeluaran</h1>
        </div>
        <ExpenseForm />
      </div>
    </div>
  );
}
