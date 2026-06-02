export type TransactionType =
  | "default"
  | "upcoming"
  | "subscription"
  | "repetitive"
  | "lent"
  | "borrowed"
  | "transfer";

export type TransactionDirection = "expense" | "income" | "transfer";

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
  { value: "transfer", label: "Transfer" },
  { value: "lent", label: "Lent" },
  { value: "borrowed", label: "Borrowed" },
] as const satisfies ReadonlyArray<{ value: TransactionType; label: string }>;

export const repeatPeriodOptions = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "biweekly", label: "Biweekly" },
  { value: "month", label: "Month" },
  { value: "quarterly", label: "Quarterly" },
  { value: "year", label: "Year" },
] as const satisfies ReadonlyArray<{ value: RepeatPeriod; label: string }>;

export const repeatPeriodLabels: Record<RepeatPeriod, string> = Object.fromEntries(
  repeatPeriodOptions.map((opt) => [opt.value, opt.label])
) as Record<RepeatPeriod, string>;

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

export type TransactionPayload = {
  direction: "expense" | "income";
  transactionType: TransactionType;
  amount: number;
  installmentCount: number;
  installmentRate: number;
  description: string;
  date: number;
  categoryId?: string;
  walletId: string;
  vendorId?: string;
  notes?: string;
  receiptStorageId?: string;
  splitBill?: {
    enabled: true;
    mode: SplitMode;
    participants: Array<{
      userId?: string;
      name: string;
      amount: number;
      isPaid?: boolean;
      paidAt?: number;
    }>;
  };
};

export function validateSplitBill(args: {
  direction: TransactionDirection;
  enabled: boolean;
  mode: SplitMode;
  participantCount: number;
  customRemaining: number;
  amount: number;
}) {
  if (!args.enabled) return;
  if (args.direction !== "expense") throw new Error("Split bill hanya untuk pengeluaran");
  if (args.participantCount < 2) throw new Error("Split bill minimal 2 peserta");
  if (args.mode === "equal" && args.amount < args.participantCount) throw new Error("Jumlah transaksi terlalu kecil untuk split rata");
  if (args.mode === "custom" && args.customRemaining !== 0) throw new Error("Total split bill harus sama dengan jumlah transaksi");
}

export function buildTransactionPayload(args: {
  direction: Exclude<TransactionDirection, "transfer">;
  formTransactionType: string;
  amount: number;
  installmentCount: number;
  installmentRate: number;
  description: string;
  date: Date;
  categoryId?: string;
  walletId: string;
  vendorId?: string;
  notes?: string;
  receiptStorageId?: string | null;
  splitBillEnabled: boolean;
  splitMode: SplitMode;
  displaySplitParticipants: DisplaySplitParticipant[];
}) {
  const isRecurring = isRecurringTransactionType(args.formTransactionType as TransactionType);

  return {
    direction: args.direction,
    transactionType: args.formTransactionType as TransactionType,
    amount: args.amount,
    installmentCount: isRecurring ? args.installmentCount : 1,
    installmentRate: isRecurring ? args.installmentRate : 0,
    description: args.description,
    date: args.date.getTime(),
    categoryId: args.categoryId || undefined,
    walletId: args.walletId,
    vendorId: args.direction === "expense" && args.vendorId ? args.vendorId : undefined,
    notes: args.notes || undefined,
    receiptStorageId: args.receiptStorageId || undefined,
    splitBill: args.direction === "expense" && args.splitBillEnabled
      ? buildSplitBillPayload(args.amount, args.splitMode, args.displaySplitParticipants)
      : undefined,
  } satisfies TransactionPayload;
}

function buildSplitBillPayload(
  amount: number,
  mode: SplitMode,
  participants: DisplaySplitParticipant[],
) {
  const { base, remainder } = getEqualSplitValues(amount, participants.length);
  return {
    enabled: true as const,
    mode,
    participants: participants.map((participant, index) => ({
      userId: participant.userId || undefined,
      name: participant.name,
      amount: mode === "equal" ? base + (index < remainder ? 1 : 0) : participant.amount,
      isPaid: participant.isPaid || undefined,
      paidAt: participant.isPaid ? participant.paidAt ?? Date.now() : undefined,
    })),
  };
}
