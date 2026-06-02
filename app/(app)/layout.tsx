export const dynamic = "force-dynamic";

import { AuthGuard } from "@/components/auth/AuthGuard";
import { ResponsiveAppShell } from "@/components/web/ResponsiveAppShell";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <ResponsiveAppShell>{children}</ResponsiveAppShell>
    </AuthGuard>
  );
}
