"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Receipt, Plus, User } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/expenses", icon: Receipt, label: "Pengeluaran" },
  { href: "/profile", icon: User, label: "Profil" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-zinc-900 border-t border-zinc-800 z-50">
      <div className="flex items-center justify-around px-4 py-2 max-w-lg mx-auto">
        {navItems.map((item, i) => {
          // Insert FAB before the trailing profile tab.
          const isActive = pathname.startsWith(item.href);
          return (
            <div key={item.href} className="contents">
              {i === 1 && (
                <Link
                  key="fab"
                  href="/expenses/new"
                  className="flex items-center justify-center w-14 h-14 -mt-6 bg-blue-600 rounded-full shadow-lg hover:bg-blue-500 transition-colors"
                >
                  <Plus className="w-7 h-7 text-white" />
                </Link>
              )}
              <Link
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-4 py-1 rounded-lg transition-colors min-w-[64px]",
                  isActive ? "text-blue-400" : "text-zinc-500"
                )}
              >
                <item.icon className="w-5 h-5" />
                <span className="text-[10px]">{item.label}</span>
              </Link>
            </div>
          );
        })}
      </div>
    </nav>
  );
}
