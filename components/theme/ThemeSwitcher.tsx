"use client";

import { LaptopMinimal, MoonStar, SunMedium } from "lucide-react";
import { useTheme } from "next-themes";

import { cn } from "@/lib/utils";

const themeOptions = [
  { value: "light", label: "Light", icon: SunMedium },
  { value: "dark", label: "Dark", icon: MoonStar },
  { value: "system", label: "System", icon: LaptopMinimal },
] as const;

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="rounded-3xl border border-border bg-card/90 p-4 shadow-sm">
      <div className="mb-3">
        <p className="text-sm font-semibold text-card-foreground">Tema</p>
        <p className="text-xs text-muted-foreground">
          Pilih terang, gelap, atau ikuti sistem perangkat.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {themeOptions.map(({ value, label, icon: Icon }) => {
          const active = theme === value;

          return (
            <button
              key={value}
              type="button"
              onClick={() => setTheme(value)}
              className={cn(
                "flex flex-col items-center gap-2 rounded-2xl border px-3 py-3 text-center text-xs font-medium transition-colors",
                active
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-border bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
