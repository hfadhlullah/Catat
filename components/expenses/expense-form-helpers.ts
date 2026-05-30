export type TransactionType =
  | "default"
  | "upcoming"
  | "subscription"
  | "repetitive"
  | "lent"
  | "borrowed";

export type RepeatPeriod = "day" | "week" | "biweekly" | "month" | "quarterly" | "year";
export type SplitMode = "equal" | "custom";

export type SplitParticipant = {
  id: string;
  userId?: string;
  name: string;
  amount: number;
  isPaid: boolean;
  paidAt?: number;
};

export type DisplaySplitParticipant = SplitParticipant;

export const expenseCardShadow =
  "rounded-2xl border border-border bg-card p-4 shadow-[2px_3px_0px_0px_rgba(0,0,0,0.06)] dark:shadow-[2px_3px_0px_0px_rgba(255,255,255,0.06)]";

export const transactionTypeOptions = [
  { value: "default", label: "Default" },
  { value: "upcoming", label: "Upcoming" },
  { value: "subscription", label: "Subscription" },
  { value: "repetitive", label: "Repetitive" },
  { value: "lent", label: "Lent" },
  { value: "borrowed", label: "Borrowed" },
] as const satisfies ReadonlyArray<{ value: TransactionType; label: string }>;

export const repeatPeriodLabels: Record<RepeatPeriod, string> = {
  day: "day",
  week: "week",
  biweekly: "biweekly",
  month: "month",
  quarterly: "quarterly",
  year: "year",
};

export function formatRupiah(value: string) {
  const num = value.replace(/\D/g, "");
  if (!num) return "";
  return new Intl.NumberFormat("id-ID").format(Number(num));
}

export function isRecurringTransactionType(transactionType: TransactionType) {
  return transactionType === "subscription" || transactionType === "repetitive";
}

export function getEqualSplitValues(amount: number, splitParticipantCount: number) {
  const base = splitParticipantCount > 0 ? Math.floor(amount / splitParticipantCount) : 0;
  const remainder = splitParticipantCount > 0 ? amount - base * splitParticipantCount : 0;

  return { base, remainder };
}
