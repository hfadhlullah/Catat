"use client";

import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { X } from "lucide-react";

import { Calendar } from "@/components/ui/calendar";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { formatIDR } from "@/lib/currency";
import { cn } from "@/lib/utils";

import {
  repeatPeriodLabels,
  repeatPeriodOptions,
  type RepeatPeriod,
} from "./transaction-helpers";

interface RecurringTransactionSectionProps {
  amountValue: number;
  installmentCount: number;
  installmentRate: number;
  periodSheetOpen: boolean;
  repeatEvery: number;
  repeatPeriod: RepeatPeriod;
  repeatUntil: Date | null;
  untilPickerOpen: boolean;
  onPeriodSheetOpenChange: (open: boolean) => void;
  onRepeatEveryChange: (value: number) => void;
  onRepeatPeriodChange: (period: RepeatPeriod) => void;
  onRepeatUntilChange: (date: Date | null) => void;
  onUntilPickerOpenChange: (open: boolean) => void;
  onInstallmentRateChange: (value: number) => void;
}

export function RecurringTransactionSection({
  amountValue,
  installmentCount,
  installmentRate,
  periodSheetOpen,
  repeatEvery,
  repeatPeriod,
  repeatUntil,
  untilPickerOpen,
  onPeriodSheetOpenChange,
  onRepeatEveryChange,
  onRepeatPeriodChange,
  onRepeatUntilChange,
  onUntilPickerOpenChange,
  onInstallmentRateChange,
}: RecurringTransactionSectionProps) {
  const totalWithInterest = Math.round(amountValue * (1 + installmentRate / 100));
  const perInstallment = installmentCount > 0 ? Math.round(totalWithInterest / installmentCount) : 0;

  return (
    <div className="space-y-3 rounded-xl border border-border bg-background/60 p-4">
      <div className="flex items-center justify-center gap-2 text-sm font-medium text-foreground">
        <span>Repeat every</span>
        <input
          type="number"
          min={1}
          step={1}
          value={repeatEvery}
          onChange={(e) => onRepeatEveryChange(Math.max(1, Number(e.target.value)))}
          className="w-12 bg-transparent text-center text-lg font-bold text-foreground outline-none border-b border-border focus:border-primary"
        />
        <button
          type="button"
          onClick={() => onPeriodSheetOpenChange(true)}
          className="rounded-lg border border-border bg-background px-2.5 py-1 text-sm font-semibold text-foreground transition-colors hover:bg-accent"
        >
          {repeatPeriodLabels[repeatPeriod]}
        </button>
      </div>

      <div className="flex items-center justify-center gap-2 text-sm">
        <span className="font-medium text-foreground">until</span>
        {repeatUntil ? (
          <span className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onUntilPickerOpenChange(true)}
              className="rounded-lg border border-border bg-background px-2.5 py-1 text-sm font-semibold text-foreground transition-colors hover:bg-accent"
            >
              {format(repeatUntil, "d MMM yyyy", { locale: idLocale })}
            </button>
            <button
              type="button"
              onClick={() => onRepeatUntilChange(null)}
              className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            >
              <X className="h-3 w-3" />
            </button>
            <span className="text-xs text-muted-foreground">
              (×{installmentCount})
            </span>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => onUntilPickerOpenChange(true)}
            className="rounded-lg border border-border bg-background px-2.5 py-1 text-sm font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            Forever
          </button>
        )}
      </div>

      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <span>Bunga</span>
        <input
          type="number"
          min={0}
          step="0.01"
          value={installmentRate}
          onChange={(e) => onInstallmentRateChange(Number(e.target.value))}
          className="w-14 bg-transparent text-center text-base font-semibold text-foreground outline-none border-b border-border focus:border-primary"
        />
        <span>%</span>
      </div>

      {amountValue > 0 && installmentCount > 1 && (
        <div className="rounded-xl border border-dashed border-border bg-background px-3 py-3 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Estimasi total dibayar</span>
            <span className="font-medium text-foreground">{formatIDR(totalWithInterest)}</span>
          </div>
          <div className="mt-2 flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Per cicilan ({installmentCount}x)</span>
            <span className="font-medium text-foreground">{formatIDR(perInstallment)}</span>
          </div>
        </div>
      )}

      <Sheet open={periodSheetOpen} onOpenChange={onPeriodSheetOpenChange}>
        <SheetContent side="bottom" className="max-h-[60dvh] rounded-t-3xl px-5 py-6 overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-left text-lg font-bold">Select Period</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-2">
            {repeatPeriodOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onRepeatPeriodChange(opt.value);
                  onPeriodSheetOpenChange(false);
                }}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium transition-colors",
                  repeatPeriod === opt.value
                    ? "bg-primary/10 text-primary ring-1 ring-primary"
                    : "text-foreground hover:bg-accent"
                )}
              >
                <span
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors",
                    repeatPeriod === opt.value
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-muted-foreground/30"
                  )}
                >
                  {repeatPeriod === opt.value && <span className="h-2 w-2 rounded-full bg-current" />}
                </span>
                {opt.label}
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={untilPickerOpen} onOpenChange={onUntilPickerOpenChange}>
        <SheetContent side="bottom" className="max-h-[55dvh] rounded-t-3xl px-4 py-6 overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-left text-lg font-bold">Pilih Tanggal Berakhir</SheetTitle>
          </SheetHeader>
          <div className="mt-4 flex justify-center">
            <Calendar
              mode="single"
              selected={repeatUntil ?? undefined}
              onSelect={(d: Date | undefined) => {
                if (!d) return;
                onRepeatUntilChange(d);
                onUntilPickerOpenChange(false);
              }}
              className="bg-transparent"
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
