"use client";

import { Icon, addCollection } from "@iconify/react/dist/offline";
import { icons as solarIcons } from "@iconify-json/solar";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

addCollection(solarIcons);

const leftItems = [
  { href: "/dashboard", icon: "solar:home-smile-angle-bold-duotone", label: "Dashboard" },
  { href: "/wallets", icon: "solar:wallet-money-bold-duotone", label: "Wallet" },
];

const rightItems = [
  { href: "/transactions", icon: "solar:bill-list-bold-duotone", label: "Transaksi" },
  { href: "/profile", icon: "solar:user-circle-bold-duotone", label: "Profil" },
];

function NavItem({ href, icon, label, isActive }: { href: string; icon: string; label: string; isActive: boolean }) {
  return (
    <Link
      href={href}
      aria-label={label}
      className={cn(
        "flex flex-col items-center justify-center gap-0.5 px-2.5 py-2 rounded-xl transition-all duration-200 w-14",
        isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
      )}
    >
      <span className={cn("flex items-center justify-center w-10 h-8 rounded-xl transition-all duration-200", isActive && "bg-primary/12")}>
        <Icon icon={icon} className={cn("w-6 h-6 transition-transform duration-200", isActive && "scale-110")} />
      </span>
      <span className={cn("text-xs leading-none", isActive ? "font-bold" : "font-medium")}>{label}</span>
    </Link>
  );
}

export function BottomNav() {
  const pathname = usePathname();

  const isTransactionForm =
    pathname === "/transactions/new" || /^\/transactions\/[^/]+\/edit$/.test(pathname);

  if (isTransactionForm) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 px-5 pb-6">
      <div className="mx-auto grid max-w-lg grid-cols-[1fr_auto_1fr] items-center rounded-2xl border border-border/70 bg-card/95 px-2 py-2.5 shadow-lg backdrop-blur-md">
        <div className="flex items-center justify-evenly">
          {leftItems.map((item) => (
            <NavItem key={item.href} {...item} isActive={pathname.startsWith(item.href)} />
          ))}
        </div>

        <div className="flex justify-center">
          <Link
            href="/transactions/new"
            aria-label="Tambah transaksi"
            transitionTypes={["page-slide-up"]}
            className="flex h-13 w-13 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/30 transition-all duration-150 hover:bg-primary/90 active:scale-95"
          >
            <span className="text-primary-foreground text-3xl leading-none font-medium">+</span>
          </Link>
        </div>

        <div className="flex items-center justify-evenly">
          {rightItems.map((item) => (
            <NavItem key={item.href} {...item} isActive={pathname.startsWith(item.href)} />
          ))}
        </div>
      </div>
    </nav>
  );
}
