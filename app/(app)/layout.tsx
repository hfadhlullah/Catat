export const dynamic = "force-dynamic";

import { BottomNav } from "@/components/layout/BottomNav";
import { SeedProvider } from "@/components/providers/SeedProvider";
import { AuthGuard } from "@/components/auth/AuthGuard";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="flex flex-col min-h-screen pb-24">
        <SeedProvider />
        <main className="flex-1">{children}</main>
        <BottomNav />
      </div>
    </AuthGuard>
  );
}
