"use client";

import { Icon, addCollection } from "@iconify/react/dist/offline";
import { icons as solarIcons } from "@iconify-json/solar";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

addCollection(solarIcons);

const leftItems = [
  { href: "/dashboard", icon: "solar:home-smile-angle-bold-duotone", label: "Dashboard" },
  { href: "/reports", icon: "solar:chart-2-bold-duotone", label: "Laporan" },
];

const rightItems = [
  { href: "/expenses", icon: "solar:bill-list-bold-duotone", label: "Pengeluaran" },
  { href: "/profile", icon: "solar:user-circle-bold-duotone", label: "Profil" },
];

function NavItem({ href, icon, label, isActive }: { href: string; icon: string; label: string; isActive: boolean }) {
  return (
    <Link
      href={href}
      aria-label={label}
      className={cn(
        "flex items-center justify-center px-2.5 py-2 rounded-xl transition-all duration-200 w-14",
        isActive ? "text-blue-400 bg-blue-500/10" : "text-zinc-500 hover:text-zinc-300"
      )}
    >
      <Icon icon={icon} className={cn("w-6 h-6 transition-transform duration-200", isActive && "scale-110")} />
    </Link>
  );
}

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 px-5 pb-6">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center max-w-lg mx-auto bg-zinc-900/95 backdrop-blur-md border border-zinc-700/40 rounded-2xl px-2 py-2.5 shadow-2xl shadow-black/50">
        <div className="flex items-center justify-evenly">
          {leftItems.map((item) => (
            <NavItem key={item.href} {...item} isActive={pathname.startsWith(item.href)} />
          ))}
        </div>

        <div className="flex justify-center">
          <Link
            href="/expenses/new"
            aria-label="Tambah pengeluaran"
            className="flex items-center justify-center w-13 h-13 bg-blue-600 rounded-2xl shadow-lg shadow-blue-600/40 hover:bg-blue-500 active:scale-95 transition-all duration-150"
          >
            <span className="text-white text-3xl leading-none font-medium">+</span>
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
