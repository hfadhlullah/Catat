"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { ArrowLeft, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { ExpenseForm } from "@/components/expenses/ExpenseForm";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

function RedirectTo({ path }: { path: string }) {
  const router = useRouter();
  useEffect(() => {
    router.replace(path);
  }, [path, router]);
  return null;
}

export default function EditExpensePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const transaction = useQuery(api.transactions.getTransactionById, { id: id as Id<"transactions"> });
  const deleteTransaction = useMutation(api.transactions.deleteTransaction);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirming) {
      setConfirming(true);
      toast.message("Tekan lagi untuk menghapus transaksi");
      setTimeout(() => setConfirming(false), 3000);
      return;
    }
    setDeleting(true);
    try {
      await deleteTransaction({ id: id as Id<"transactions"> });
      toast.success("Transaksi dihapus");
      router.push("/expenses");
    } catch {
      toast.error("Gagal menghapus");
      setDeleting(false);
    }
  }

  if (transaction === undefined) {
    return (
      <div className="relative min-h-screen pb-6">
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
          <div className="pt-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl border border-border bg-muted" />
              <div className="space-y-2">
                <Skeleton className="h-7 w-40 rounded-lg bg-muted" />
                <Skeleton className="h-4 w-56 rounded-lg bg-muted" />
              </div>
            </div>
            <div className="h-9 w-9 rounded-xl border border-border bg-muted" />
          </div>
          <Skeleton className="h-32 rounded-2xl bg-muted" />
          <Skeleton className="h-64 rounded-2xl bg-muted" />
          <Skeleton className="h-48 rounded-2xl bg-muted" />
          <Skeleton className="h-14 rounded-2xl bg-muted" />
        </div>
      </div>
    );
  }

  if (transaction === null) {
    return <RedirectTo path="/expenses" />;
  }

  if (!transaction.isOwner) {
    return (
      <div className="relative min-h-screen pb-6">
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
          <div className="pt-4 mb-5 flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              aria-label="Kembali"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-2">
              <span className="inline-block -rotate-1 bg-primary text-primary-foreground px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest rounded-md">
                Detail
              </span>
              <span className="text-sm text-muted-foreground font-medium">
                Transaksi
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-[2px_3px_0px_0px_rgba(0,0,0,0.06)] dark:shadow-[2px_3px_0px_0px_rgba(255,255,255,0.06)]">
            <p className="text-base font-medium text-foreground">Anda tidak dapat mengedit transaksi ini.</p>
            <p className="mt-1 text-sm text-muted-foreground">Hanya pembuat transaksi yang bisa mengedit atau menghapus.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen pb-6">
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
        <div className="pt-4 mb-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              aria-label="Kembali"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-2">
              <span className="inline-block -rotate-1 bg-primary text-primary-foreground px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest rounded-md">
                Edit
              </span>
              <span className="text-sm text-muted-foreground font-medium">
                Transaksi
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-xl border transition-all duration-150",
              confirming
                ? "border-destructive/40 bg-destructive/10 text-destructive"
                : "border-border bg-card text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            )}
            aria-label={confirming ? "Yakin hapus?" : "Hapus"}
            title={confirming ? "Yakin hapus?" : "Hapus"}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
        <ExpenseForm
          mode="edit"
          expenseId={transaction._id}
          initialExpense={transaction}
        />
      </div>
    </div>
  );
}
