"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Receipt, Plus, User } from "lucide-react";
import { cn } from "@/lib/utils";

const leftItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
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
        "flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all duration-200 min-w-[56px]",
        isActive ? "text-blue-400 bg-blue-500/10" : "text-zinc-500 hover:text-zinc-300"
      )}
    >
      <Icon className={cn("w-5 h-5 transition-transform duration-200", isActive && "scale-110")} />
      <span className={cn("text-[10px] font-medium", isActive ? "opacity-100" : "opacity-60")}>
        {label}
      </span>
    </Link>
  );
}

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-5">
      <div className="grid grid-cols-3 items-center max-w-sm mx-auto bg-zinc-900/90 backdrop-blur-md border border-zinc-700/50 rounded-2xl px-3 py-2 shadow-xl shadow-black/40">
        <div className="flex justify-around">
          {leftItems.map((item) => (
            <NavItem key={item.href} {...item} isActive={pathname.startsWith(item.href)} />
          ))}
        </div>

        <div className="flex justify-center">
          <Link
            href="/expenses/new"
            className="flex items-center justify-center w-12 h-12 bg-blue-600 rounded-xl shadow-lg shadow-blue-600/40 hover:bg-blue-500 active:scale-95 transition-all duration-150"
          >
            <Plus className="w-6 h-6 text-white" />
          </Link>
        </div>

        <div className="flex justify-around">
          {rightItems.map((item) => (
            <NavItem key={item.href} {...item} isActive={pathname.startsWith(item.href)} />
          ))}
        </div>
      </div>
    </nav>
  );
}
