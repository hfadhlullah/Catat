"use client";

import { Icon, addCollection } from "@iconify/react/dist/offline";
import { icons as solarIcons } from "@iconify-json/solar";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "convex/react";
import { Plus } from "lucide-react";

import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";
import { CatatLogo } from "@/components/brand/CatatLogo";
import { ThemeSwitcher } from "@/components/theme/ThemeSwitcher";

addCollection(solarIcons);

const navItems = [
  { href: "/dashboard", icon: "solar:home-smile-angle-bold-duotone", label: "Dashboard" },
  { href: "/transactions", icon: "solar:bill-list-bold-duotone", label: "Transaksi" },
  { href: "/wallets", icon: "solar:wallet-money-bold-duotone", label: "Wallet" },
  { href: "/reports", icon: "solar:chart-2-bold-duotone", label: "Laporan" },
  { href: "/profile", icon: "solar:user-circle-bold-duotone", label: "Profil" },
];

export function WebSidebar() {
  const pathname = usePathname();
  const userProfile = useQuery(api.users.getCurrentUserProfile);

  return (
    <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col overflow-y-auto border-r border-border bg-card/80 px-4 py-6 backdrop-blur-sm">
      <div className="flex items-center gap-2 px-2">
        <CatatLogo className="h-7 w-auto" />
      </div>

      <Link
        href="/transactions/new"
        className="mt-7 flex h-11 items-center justify-center gap-2 rounded-2xl bg-primary text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition-all duration-150 hover:bg-primary/90 active:scale-[0.98]"
      >
        <Plus className="h-4 w-4" />
        Tambah Transaksi
      </Link>

      <nav className="mt-6 flex flex-col gap-1">
        {navItems.map((item) => {
          const isActive =
            item.href === "/transactions"
              ? pathname === "/transactions" || pathname.startsWith("/transactions/")
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150",
                isActive
                  ? "bg-primary/12 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <Icon icon={item.icon} className={cn("h-5 w-5 shrink-0", isActive && "scale-110")} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-4">
        <ThemeSwitcher />
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-background/60 px-3 py-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/12 text-sm font-bold text-primary">
            {(userProfile?.name ?? "?").charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">{userProfile?.name ?? "…"}</p>
            <p className="truncate text-xs text-muted-foreground">{userProfile?.email ?? ""}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
