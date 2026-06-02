"use client";

import { BottomNav } from "@/components/layout/BottomNav";
import { useIsDesktop } from "@/hooks/use-desktop";
import { WebShell } from "@/components/web/WebShell";

/**
 * Decides between the existing mobile/PWA layout and the desktop web layout
 * based on viewport. The mobile branch renders byte-identical markup to the
 * original (app) layout — no behavior change for phones or installed PWAs.
 *
 * On desktop the route's mobile `page.tsx` (passed as `children`) is NOT
 * rendered; `WebShell` renders the matching desktop screen instead, so the
 * mobile page never mounts and runs no queries.
 */
export function ResponsiveAppShell({ children }: { children: React.ReactNode }) {
  const isDesktop = useIsDesktop();

  if (isDesktop) {
    return <WebShell />;
  }

  return (
    <div className="flex flex-col min-h-screen pb-24">
      <main className="flex-1">{children}</main>
      <BottomNav />
    </div>
  );
}
