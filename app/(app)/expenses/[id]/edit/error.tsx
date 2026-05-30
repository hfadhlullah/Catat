"use client";

import Link from "next/link";

export default function EditExpenseError() {
  return (
    <div className="min-h-screen pb-24">
      <div className="p-4 max-w-lg mx-auto">
        <div className="rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
          <h1 className="text-lg font-semibold text-foreground">Transaksi tidak dapat dibuka</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Data mungkin sudah dihapus atau Anda tidak memiliki akses.
          </p>
          <Link
            href="/expenses"
            className="mt-4 inline-flex rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Kembali ke transaksi
          </Link>
        </div>
      </div>
    </div>
  );
}
