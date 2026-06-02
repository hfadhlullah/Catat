"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";

import { WebSidebar } from "@/components/web/WebSidebar";
import { WebDashboard } from "@/components/web/screens/WebDashboard";
import { WebTransactions } from "@/components/web/screens/WebTransactions";
import { WebWallets } from "@/components/web/screens/WebWallets";
import { WebReports } from "@/components/web/screens/WebReports";
import { WebProfile } from "@/components/web/screens/WebProfile";

// Transaction form pages: reused unchanged — the form component (with all
// split-bill / recurring / vendor / photo sub-sections) is desktop-friendly
// as-is and not worth duplicating. Only the outer frame (sidebar, etc.) is new.
import NewExpensePage from "@/app/(app)/transactions/new/page";
import EditExpensePage from "@/app/(app)/transactions/[id]/edit/page";

function EditTransactionScreen({ id }: { id: string }) {
  // EditExpensePage expects `params` as a Promise; memoize so React.use gets a
  // stable promise across re-renders.
  const params = useMemo(() => Promise.resolve({ id }), [id]);
  return <EditExpensePage params={params} />;
}

function CurrentScreen() {
  const pathname = usePathname();

  if (pathname === "/dashboard" || pathname === "/") return <WebDashboard />;
  if (pathname === "/transactions") return <WebTransactions />;
  if (pathname === "/transactions/new") return <NewExpensePage />;

  const editMatch = pathname.match(/^\/transactions\/([^/]+)\/edit$/);
  if (editMatch) return <EditTransactionScreen id={editMatch[1]} />;

  if (pathname.startsWith("/wallets")) return <WebWallets />;
  if (pathname.startsWith("/profile")) return <WebProfile />;
  if (pathname.startsWith("/reports")) return <WebReports />;

  return <WebDashboard />;
}

export function WebShell() {
  return (
    <div className="relative min-h-screen">
      {/* Paper texture — shared with mobile, adapts to light / dark */}
      <div
        className="fixed inset-0 -z-10
          bg-[#faf9f6] dark:bg-[#0f172a]
          bg-[radial-gradient(#e2e0d8_1px,transparent_1px)]
          dark:bg-[radial-gradient(#1e293b_1px,transparent_1px)]
          [background-size:32px_32px] opacity-60 dark:opacity-40"
        aria-hidden="true"
      />

      <div className="flex">
        <WebSidebar />
        <main className="min-w-0 flex-1">
          <div className="mx-auto w-full max-w-screen-2xl px-8 py-8">
            <CurrentScreen />
          </div>
        </main>
      </div>
    </div>
  );
}
