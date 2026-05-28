"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Receipt, Plus, User, BarChart2 } from "lucide-react";
import { cn } from "@/lib/utils";

const leftItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/reports", icon: BarChart2, label: "Laporan" },
];

const rightItems = [
  { href: "/expenses", icon: Receipt, label: "Pengeluaran" },
  { href: "/profile", icon: User, label: "Profil" },
];

function NavItem({ href, icon: Icon, label, isActive }: { href: string; icon: React.ElementType; label: string; isActive: boolean }) {
  return (
    <Link
      href={href}
      className={cn(
        "flex flex-col items-center gap-1 px-2.5 py-2 rounded-xl transition-all duration-200 w-14",
        isActive ? "text-blue-400 bg-blue-500/10" : "text-zinc-500 hover:text-zinc-300"
      )}
    >
      <Icon className={cn("w-5 h-5 transition-transform duration-200", isActive && "scale-110")} />
      <span className={cn("text-[9px] font-medium leading-none", isActive ? "opacity-100" : "opacity-50")}>
        {label}
      </span>
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
            className="flex items-center justify-center w-13 h-13 bg-blue-600 rounded-2xl shadow-lg shadow-blue-600/40 hover:bg-blue-500 active:scale-95 transition-all duration-150"
          >
            <Plus className="w-6 h-6 text-white" />
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
