import { useEffect, useState } from "react";
import type { UseFormSetValue } from "react-hook-form";

import { isRecurringTransactionType, type RepeatPeriod, type TransactionType } from "./transaction-helpers";

type FormFields = {
  installmentCount: number;
  description: string;
  date: Date;
  amount: number;
  walletId: string;
  transactionType: string;
  installmentRate: number;
  categoryId?: string;
  vendorId?: string;
  notes?: string;
};

interface UseRecurringTransactionOptions {
  transactionType: TransactionType;
  selectedDate: Date;
  setValue: UseFormSetValue<FormFields>;
  initialValues?: {
    repeatEvery?: number;
    repeatPeriod?: RepeatPeriod;
    repeatUntil?: Date | null;
  };
}

export function useRecurringTransaction({
  transactionType,
  selectedDate,
  setValue,
  initialValues,
}: UseRecurringTransactionOptions) {
  const [repeatEvery, setRepeatEvery] = useState(initialValues?.repeatEvery ?? 1);
  const [repeatPeriod, setRepeatPeriod] = useState<RepeatPeriod>(initialValues?.repeatPeriod ?? "month");
  const [repeatUntil, setRepeatUntil] = useState<Date | null>(initialValues?.repeatUntil ?? null);
  const [periodSheetOpen, setPeriodSheetOpen] = useState(false);
  const [untilPickerOpen, setUntilPickerOpen] = useState(false);

  useEffect(() => {
    if (!isRecurringTransactionType(transactionType)) return;
    if (!repeatUntil) {
      setValue("installmentCount", repeatEvery, { shouldValidate: true });
      return;
    }
    const start = selectedDate.getTime();
    const end = repeatUntil.getTime();
    const diffMs = end - start;
    if (diffMs <= 0) {
      setValue("installmentCount", repeatEvery, { shouldValidate: true });
      return;
    }
    let periodMs = 30.44 * 86400000;
    switch (repeatPeriod) {
      case "day": periodMs = 86400000; break;
      case "week": periodMs = 7 * 86400000; break;
      case "biweekly": periodMs = 14 * 86400000; break;
      case "month": periodMs = 30.44 * 86400000; break;
      case "quarterly": periodMs = 91.31 * 86400000; break;
      case "year": periodMs = 365.25 * 86400000; break;
    }
    const occurrences = Math.max(1, Math.floor(diffMs / (repeatEvery * periodMs)) + 1);
    setValue("installmentCount", occurrences, { shouldValidate: true });
  }, [repeatEvery, repeatPeriod, repeatUntil, transactionType, selectedDate, setValue]);

  return {
    repeatEvery,
    setRepeatEvery,
    repeatPeriod,
    setRepeatPeriod,
    repeatUntil,
    setRepeatUntil,
    periodSheetOpen,
    setPeriodSheetOpen,
    untilPickerOpen,
    setUntilPickerOpen,
  };
}
