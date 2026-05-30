"use client";

import { useEffect, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import {
  CalendarIcon,
  ChevronDown,
  Paperclip,
  FileText,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  X,
} from "lucide-react";

import { Calendar } from "@/components/ui/calendar";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { CategoryAddSheet } from "./CategoryAddSheet";
import { SplitBillSection } from "./SplitBillSection";
import { VendorSection } from "./VendorSection";
import {
  expenseCardShadow,
  formatRupiah,
  isRecurringTransactionType,
  repeatPeriodLabels,
  transactionTypeOptions,
  type RepeatPeriod,
  type TransactionType,
} from "./expense-form-helpers";
import { useExpenseReceipt } from "./use-expense-receipt";
import { useExpenseSplitBill } from "./use-expense-split-bill";
import { formatIDR } from "@/lib/currency";
import { cn } from "@/lib/utils";
import { useMobile } from "@/hooks/use-mobile";

const schema = z.object({
  amount: z.number().min(1, "Masukkan jumlah"),
  installmentCount: z.number().int().min(1, "Minimal 1x"),
  installmentRate: z.number().min(0, "Minimal 0%"),
  description: z.string().min(1, "Masukkan deskripsi"),
  date: z.date(),
  categoryId: z.string().optional(),
  walletId: z.string().min(1, "Pilih wallet"),
  vendorId: z.string().optional(),
  notes: z.string().optional(),
  transactionType: z.string().min(1, "Pilih tipe transaksi"),
});

type FormValues = z.infer<typeof schema>;

interface ExpenseFormProps {
  mode?: "create" | "edit";
  expenseId?: Id<"transactions">;
  initialExpense?: {
    _id: Id<"transactions">;
    direction?: "expense" | "income";
    transactionType?: "default" | "upcoming" | "subscription" | "repetitive" | "lent" | "borrowed";
    amount: number;
    installmentCount?: number;
    installmentRate?: number;
    description: string;
    date: number;
    categoryId?: Id<"categories">;
    walletId?: Id<"wallets">;
    vendorId?: Id<"vendors">;
    notes?: string;
    receiptStorageId?: Id<"_storage">;
    receiptUrl?: string | null;
    splitBill?: {
      enabled: boolean;
      mode: "equal" | "custom";
      participants: Array<{
        userId?: Id<"userProfiles">;
        name: string;
        amount: number;
        isPaid?: boolean;
        paidAt?: number;
      }>;
    };
  };
}

export function ExpenseForm({ mode = "create", expenseId, initialExpense }: ExpenseFormProps) {
  const router = useRouter();
  const amountRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const initializedExpenseRef = useRef<string | null>(null);

  const wallets = useQuery(api.wallets.listWallets);
  const currentProfile = useQuery(api.profile.getCurrentProfileQuery);
  const vendors = useQuery(api.vendors.listVendors);
  const createExpense = useMutation(api.transactions.createTransaction);
  const updateExpense = useMutation(api.transactions.updateTransaction);
  const ensureDefaultCategories = useMutation(api.categories.ensureDefaultCategories);
  const createVendor = useMutation(api.vendors.createVendor);
  const generateUploadUrl = useMutation(api.transactions.generateUploadUrl);
  const registerUploadedReceipt = useMutation(api.transactions.registerUploadedReceipt);
  const extractReceiptAction = useAction(api.ocr.extractReceipt);

  const [uploading, setUploading] = useState(false);
  const [newVendorName, setNewVendorName] = useState("");
  const [showNewVendor, setShowNewVendor] = useState(false);
  const [amountDisplay, setAmountDisplay] = useState("");
  const [categorySearch, setCategorySearch] = useState("");
  const [direction, setDirection] = useState<"expense" | "income">("expense");
  const [transactionType, setTransactionType] = useState<TransactionType>("default");
  const [categorySheetOpen, setCategorySheetOpen] = useState(false);
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [sheetPrimaryId, setSheetPrimaryId] = useState<string | null>(null);
  const [addCategoryOpen, setAddCategoryOpen] = useState(false);
  const [repeatEvery, setRepeatEvery] = useState(1);
  const [repeatPeriod, setRepeatPeriod] = useState<RepeatPeriod>("month");
  const [repeatUntil, setRepeatUntil] = useState<Date | null>(null);
  const [periodSheetOpen, setPeriodSheetOpen] = useState(false);
  const [untilPickerOpen, setUntilPickerOpen] = useState(false);
  const splitBill = useExpenseSplitBill();
  const receipt = useExpenseReceipt({
    onAmountExtracted: (amount) => {
      setAmountDisplay(formatRupiah(String(amount)));
      setValue("amount", amount, { shouldValidate: true });
    },
    onDateExtracted: (date) => {
      setValue("date", date);
    },
    onDescriptionExtracted: (description) => {
      setValue("description", description, { shouldValidate: true });
    },
    onVendorMatched: (vendorId) => {
      setValue("vendorId", vendorId);
    },
    onVendorDetected: (vendorName) => {
      setNewVendorName(vendorName);
      setShowNewVendor(true);
    },
    findVendorIdByName: (vendorName) => vendors?.find((vendor) => vendor.name.toLowerCase() === vendorName.toLowerCase())?._id,
    uploadReceiptFile: async (file) => {
      const uploadUrl = await generateUploadUrl();
      const res = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const { storageId } = await res.json();
      await registerUploadedReceipt({ storageId: storageId as Id<"_storage"> });
      return storageId as string;
    },
    extractReceipt: async (storageId) => extractReceiptAction({ storageId: storageId as Id<"_storage"> }),
  });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { amount: 0, description: "", date: new Date(), installmentCount: 1, installmentRate: 0, transactionType: "default", walletId: "" },
  });

  const isMobile = useMobile();
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const selectedDate = useWatch({ control, name: "date" });
  const selectedCategoryId = useWatch({ control, name: "categoryId" });
  const selectedWalletId = useWatch({ control, name: "walletId" });
  const selectedVendorId = useWatch({ control, name: "vendorId" });
  const categories = useQuery(api.categories.listCategories, selectedWalletId ? { walletId: selectedWalletId as Id<"wallets"> } : "skip");
  const walletMembers = useQuery(api.walletSharing.listMembers, selectedWalletId ? { walletId: selectedWalletId as Id<"wallets"> } : "skip");
  const installmentCount = useWatch({ control, name: "installmentCount" }) ?? 1;
  const installmentRate = useWatch({ control, name: "installmentRate" }) ?? 0;
  const amountValue = useWatch({ control, name: "amount" }) ?? 0;

  useEffect(() => {
    if (mode === "create") {
      amountRef.current?.focus();
    }
  }, [mode]);

  useEffect(() => {
    void ensureDefaultCategories().catch(() => undefined);
  }, [ensureDefaultCategories]);

  useEffect(() => {
    function initializeFromExpense() {
      if (mode !== "edit" || !initialExpense) return;
      if (initializedExpenseRef.current === initialExpense._id) return;

      const isInstallment = (initialExpense.installmentCount ?? 1) > 1;
      const currentDirection = initialExpense.direction ?? "expense";
      setDirection(currentDirection);
      setTransactionType(initialExpense.transactionType ?? "default");
      setShowMoreOptions(
        Boolean(initialExpense.vendorId) ||
        Boolean(initialExpense.notes) ||
        isInstallment
      );
      // Derive repeat settings from saved installmentCount for old data
      if (isInstallment) {
        setRepeatEvery(1);
        setRepeatPeriod("month");
        setRepeatUntil(null);
      } else {
        setRepeatEvery(1);
        setRepeatPeriod("month");
        setRepeatUntil(null);
      }

      reset({
        amount: initialExpense.amount,
        installmentCount: isInstallment ? (initialExpense.installmentCount ?? 1) : 1,
        installmentRate: isInstallment ? (initialExpense.installmentRate ?? 0) : 0,
        description: initialExpense.description,
        date: new Date(initialExpense.date),
        categoryId: initialExpense.categoryId,
        walletId: initialExpense.walletId ?? "",
        vendorId: initialExpense.vendorId,
        notes: initialExpense.notes ?? "",
        transactionType: initialExpense.transactionType ?? "default",
      });
      setAmountDisplay(formatRupiah(String(initialExpense.amount)));
      receipt.setInitialReceipt(initialExpense.receiptUrl, initialExpense.receiptStorageId ?? null);
      splitBill.setInitialSplitBill(initialExpense.splitBill);
      initializedExpenseRef.current = initialExpense._id;
    }
    initializeFromExpense();
  }, [initialExpense, mode, receipt, reset, splitBill]);

  function handleAmountChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, "");
    setAmountDisplay(formatRupiah(e.target.value));
    setValue("amount", raw ? Number(raw) : 0, { shouldValidate: true });
  }

  function handleDirectionChange(nextDirection: "expense" | "income") {
    setDirection(nextDirection);
    if (nextDirection === "income") {
      setValue("vendorId", undefined);
      setValue("installmentCount", 1);
      setValue("installmentRate", 0);
      splitBill.setSplitBillEnabled(false);
    }
  }

  function handleWalletChange(walletId: string) {
    setValue("walletId", walletId, { shouldValidate: true });
    setValue("categoryId", undefined, { shouldValidate: true });
    setSheetPrimaryId(null);
    splitBill.clearWalletMembersFromSplit();
  }

  function handleOpenAddCategory() {
    if (!selectedWalletId) {
      toast.error("Pilih wallet dulu sebelum menambah kategori");
      return;
    }
    setAddCategoryOpen(true);
    setCategorySheetOpen(false);
  }

  function handleOpenCategorySheet() {
    if (!selectedWalletId) {
      toast.error("Pilih wallet dulu sebelum memilih kategori");
      return;
    }
    setSheetPrimaryId(null);
    setCategorySheetOpen(true);
  }

  async function addNewVendor() {
    if (!newVendorName.trim()) return;
    const id = await createVendor({ name: newVendorName.trim() });
    setValue("vendorId", id);
    setNewVendorName("");
    setShowNewVendor(false);
    toast.success("Vendor ditambahkan");
  }

  async function onSubmit(data: FormValues) {
    setUploading(true);
    try {
      if (!data.walletId) {
        throw new Error("Pilih wallet anda");
      }
      if (!data.transactionType) {
        throw new Error("Pilih tipe transaksi");
      }
      if (direction === "expense" && !data.categoryId) {
        throw new Error("Pilih kategori");
      }

      const receiptStorageId = await receipt.ensureReceiptStorageId();

      const splitParticipantCount = splitBill.splitParticipants.length;
      const equalPreviewBase = splitParticipantCount > 0 ? Math.floor(data.amount / splitParticipantCount) : 0;
      const equalPreviewRemainder = splitParticipantCount > 0 ? data.amount - equalPreviewBase * splitParticipantCount : 0;
      const customSplitRemaining = data.amount - splitBill.splitParticipants.reduce((sum, participant) => sum + participant.amount, 0);

      if (splitBill.splitBillEnabled) {
        if (direction !== "expense") {
          throw new Error("Split bill hanya untuk pengeluaran");
        }
        if (splitParticipantCount < 2) {
          throw new Error("Split bill minimal 2 peserta");
        }
        if (splitBill.splitMode === "equal" && data.amount < splitParticipantCount) {
          throw new Error("Jumlah transaksi terlalu kecil untuk split rata");
        }
        if (splitBill.splitMode === "custom" && customSplitRemaining !== 0) {
          throw new Error("Total split bill harus sama dengan jumlah transaksi");
        }
      }

      const payload = {
        direction,
        transactionType: data.transactionType as "default" | "upcoming" | "subscription" | "repetitive" | "lent" | "borrowed",
        amount: data.amount,
        installmentCount: isRecurringTransactionType(data.transactionType as TransactionType) ? data.installmentCount : 1,
        installmentRate: isRecurringTransactionType(data.transactionType as TransactionType) ? data.installmentRate : 0,
        description: data.description,
        date: data.date.getTime(),
        categoryId: data.categoryId ? (data.categoryId as Id<"categories">) : undefined,
        walletId: data.walletId as Id<"wallets">,
        vendorId: direction === "expense" && data.vendorId ? (data.vendorId as Id<"vendors">) : undefined,
        notes: data.notes || undefined,
        receiptStorageId: receiptStorageId ? (receiptStorageId as Id<"_storage">) : undefined,
        splitBill: direction === "expense" && splitBill.splitBillEnabled ? {
          enabled: true,
          mode: splitBill.splitMode,
          participants: displaySplitParticipants.map((participant, index) => ({
            userId: participant.userId ? (participant.userId as Id<"userProfiles">) : undefined,
            name: participant.name,
            amount: splitBill.splitMode === "equal"
              ? equalPreviewBase + (index < equalPreviewRemainder ? 1 : 0)
              : participant.amount,
            isPaid: participant.isPaid || undefined,
            paidAt: participant.isPaid ? participant.paidAt ?? Date.now() : undefined,
          })),
        } : undefined,
      };

      if (mode === "edit") {
        if (!expenseId) throw new Error("Expense ID is required");
        await updateExpense({ id: expenseId, ...payload });
        toast.success("Transaksi diperbarui!");
        router.push("/expenses");
      } else {
        await createExpense(payload);
        toast.success(direction === "expense" ? "Pengeluaran disimpan!" : "Pemasukan disimpan!");
        router.push("/dashboard");
      }
    } catch (err: unknown) {
      toast.error(
        err instanceof Error
          ? err.message
          : mode === "edit"
            ? "Gagal memperbarui"
            : "Gagal menyimpan"
      );
    } finally {
      setUploading(false);
    }
  }

  const isBusy = isSubmitting || uploading || receipt.scanning;

  // Sync installmentCount when repeat config changes
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

  const directionFiltered = (categories ?? []).filter((cat) =>
    (direction === "expense" ? cat.directionScope !== "income" : cat.directionScope !== "expense")
  );
  const primaryCategories = directionFiltered.filter((cat) => !cat.parentId);
  const subCategories = directionFiltered.filter((cat) => cat.parentId);
  const filteredCategories = directionFiltered.filter((cat) =>
    cat.name.toLowerCase().includes(categorySearch.toLowerCase())
  );
  const totalWithInterest = Math.round(amountValue * (1 + installmentRate / 100));
  const perInstallment = installmentCount > 0 ? Math.round(totalWithInterest / installmentCount) : 0;
  const selectedCategory = categories?.find((cat) => cat._id === selectedCategoryId);
  const selectedParentCategory = selectedCategory?.parentId
    ? categories?.find((cat) => cat._id === selectedCategory.parentId)
    : null;
  const isExpense = direction === "expense";
  const splitMembers = walletMembers ?? [];
  const splitMemberIds = new Set(splitBill.splitParticipants.flatMap((participant) => participant.userId ? [participant.userId] : []));
  const {
    splitParticipantCount,
    equalPreviewBase,
    equalPreviewRemainder,
    customSplitRemaining,
    splitPaidCount,
    displaySplitParticipants,
  } = splitBill.getDerivedValues(amountValue, splitMembers);

  const currentPrimarySubs = sheetPrimaryId
    ? subCategories.filter((cat) => cat.parentId === sheetPrimaryId)
    : [];

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="pb-6 space-y-5">
      {/* ── DIRECTION + CATEGORY + AMOUNT + DATE ── */}
      <div className={cn(expenseCardShadow, "overflow-hidden p-4")}>
        {/* Direction toggle */}
        <div className="grid grid-cols-2 gap-1.5 rounded-xl bg-muted/50 p-1">
          {[
            { value: "expense", label: "Pengeluaran" },
            { value: "income", label: "Pemasukan" },
          ].map((option, i) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleDirectionChange(option.value as typeof direction)}
              className={cn(
                "relative px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200",
                direction === option.value
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
              style={
                direction === option.value
                  ? { transform: `rotate(${i === 0 ? -0.5 : 0.5}deg)` }
                  : undefined
              }
            >
              {option.label}
            </button>
          ))}
        </div>

        {/* Category + Amount */}
        <div className="mt-4 flex items-center gap-4">
          {/* Category icon */}
          <button
            type="button"
            onClick={handleOpenCategorySheet}
            className={cn(
              "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-3xl transition-colors",
              selectedCategory
                ? "border border-primary/20 bg-primary/10"
                : selectedWalletId
                  ? "border border-border bg-muted/60 hover:bg-muted"
                  : "border border-border bg-muted/40 text-muted-foreground/60"
            )}
            aria-label="Pilih kategori"
          >
            {selectedCategory?.icon ?? "+"}
          </button>

          {/* Amount + category name */}
          <div className="flex-1 min-w-0 text-right">
            <div className="flex items-baseline justify-end gap-1 min-w-0">
              <span className="text-lg font-semibold text-muted-foreground">Rp</span>
              <input
                ref={amountRef}
                type="text"
                inputMode="numeric"
                value={amountDisplay}
                onChange={handleAmountChange}
                placeholder="0"
                className="min-w-0 w-full max-w-full bg-transparent text-3xl font-bold text-foreground outline-none placeholder:text-muted-foreground text-right tracking-tight"
              />
            </div>
            {selectedCategory && (
              <p className="mt-0.5 text-sm text-muted-foreground">
                {selectedParentCategory
                  ? `${selectedParentCategory.name} › ${selectedCategory.name}`
                  : selectedCategory.name}
              </p>
            )}
          </div>
        </div>

        {/* Date row */}
        <div className="mt-3">
          {isMobile ? (
            <label className="relative flex items-center justify-end gap-2 text-sm text-foreground transition-colors hover:text-primary cursor-pointer">
              <span className="text-muted-foreground">at</span>
              {format(selectedDate, "EEEE, d MMMM yyyy", { locale: idLocale })}
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
              <input
                type="date"
                className="absolute inset-0 opacity-0 cursor-pointer"
                value={format(selectedDate, "yyyy-MM-dd")}
                onChange={(e) => {
                  if (!e.target.value) return;
                  setValue("date", new Date(e.target.value + "T00:00:00"));
                }}
              />
            </label>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setDatePickerOpen(true)}
                className="flex w-full items-center justify-end gap-2 text-sm text-foreground transition-colors hover:text-primary"
              >
                <span className="text-muted-foreground">at</span>
                {format(selectedDate, "EEEE, d MMMM yyyy", { locale: idLocale })}
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
              </button>

              <Sheet open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                <SheetContent side="bottom" className="max-h-[55dvh] rounded-t-3xl px-4 py-6 overflow-y-auto">
                  <SheetHeader>
                    <SheetTitle className="text-left text-lg font-bold">Pilih Tanggal</SheetTitle>
                  </SheetHeader>
                  <div className="mt-4 flex justify-center">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(d: Date | undefined) => {
                        if (!d) return;
                        setValue("date", d);
                        setDatePickerOpen(false);
                      }}
                      className="bg-transparent"
                    />
                  </div>
                </SheetContent>
              </Sheet>
            </>
          )}
        </div>
      </div>
      {errors.amount && (
        <p className="px-1 text-xs text-destructive">{errors.amount.message}</p>
      )}

      {/* ── TIPE TRANSAKSI + CICILAN + WALLET ── */}
      <div className={cn("space-y-3 p-4", expenseCardShadow)}>
        {/* Transaction type */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-1">
          {transactionTypeOptions.map((option) => {
            const active = transactionType === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  setTransactionType(option.value);
                  setValue("transactionType", option.value, { shouldValidate: true });
                  if (option.value === "lent") handleDirectionChange("expense");
                  if (option.value === "borrowed") handleDirectionChange("income");
                }}
                className={cn(
                  "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-150",
                  active
                    ? "border-transparent bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground hover:border-primary/30"
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>
        {errors.transactionType && (
          <p className="text-xs text-destructive">{errors.transactionType.message}</p>
        )}

        {/* Cicilan (between transaction type and wallet) */}
        {isRecurringTransactionType(transactionType) && (
          <div className="space-y-3 rounded-xl border border-border bg-background/60 p-4">
            {/* Repeat every */}
            <div className="flex items-center justify-center gap-2 text-sm font-medium text-foreground">
              <span>Repeat every</span>
              <input
                type="number"
                min={1}
                step={1}
                value={repeatEvery}
                onChange={(e) => setRepeatEvery(Math.max(1, Number(e.target.value)))}
                className="w-12 bg-transparent text-center text-lg font-bold text-foreground outline-none border-b border-border focus:border-primary"
              />
              <button
                type="button"
                onClick={() => setPeriodSheetOpen(true)}
                className="rounded-lg border border-border bg-background px-2.5 py-1 text-sm font-semibold text-foreground transition-colors hover:bg-accent"
              >
                {repeatPeriodLabels[repeatPeriod]}
              </button>
            </div>

            {/* Until */}
            <div className="flex items-center justify-center gap-2 text-sm">
              <span className="font-medium text-foreground">until</span>
              {repeatUntil ? (
                <span className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setUntilPickerOpen(true)}
                    className="rounded-lg border border-border bg-background px-2.5 py-1 text-sm font-semibold text-foreground transition-colors hover:bg-accent"
                  >
                    {format(repeatUntil, "d MMM yyyy", { locale: idLocale })}
                  </button>
                  <button
                    type="button"
                    onClick={() => setRepeatUntil(null)}
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
                  onClick={() => setUntilPickerOpen(true)}
                  className="rounded-lg border border-border bg-background px-2.5 py-1 text-sm font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  Forever
                </button>
              )}
            </div>

            {/* Bunga */}
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <span>Bunga</span>
              <input
                type="number"
                min={0}
                step="0.01"
                {...register("installmentRate", { valueAsNumber: true })}
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
          </div>
        )}

        {/* Wallet */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-1">
          {wallets?.map((wallet) => {
            const active = selectedWalletId === wallet._id;
            return (
              <button
                key={wallet._id}
                type="button"
                onClick={() => handleWalletChange(wallet._id)}
                className={cn(
                  "shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-150",
                  active
                    ? "border-transparent bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground hover:border-primary/30"
                )}
              >
                {wallet.label || wallet.name}
              </button>
            );
          })}
          {wallets?.length === 0 && (
            <p className="shrink-0 text-xs text-muted-foreground">Belum ada wallet.</p>
          )}
        </div>
        {errors.walletId && (
          <p className="text-xs text-destructive">{errors.walletId.message}</p>
        )}

      </div>

      {/* ── DESCRIPTION + PHOTO ── */}
      <div className={cn("overflow-hidden", expenseCardShadow)}>
        <div className="p-4">
          <div className="flex items-start gap-2 min-w-0">
            <textarea
              {...register("description")}
              placeholder="Deskripsi transaksi..."
              rows={1}
              className="min-h-[2.5rem] w-full resize-none bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
            <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          </div>
          {errors.description && (
            <p className="mt-1 text-xs text-destructive">{errors.description.message}</p>
          )}
        </div>

        <div className="border-t border-border" />
        <div className="p-0">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => receipt.handlePhotoChange(e.target.files?.[0], () => {
              if (fileRef.current) fileRef.current.value = "";
            })}
            className="hidden"
          />
          {receipt.photoPreview ? (
            <div className="relative">
              <Image
                src={receipt.photoPreview}
                alt={mode === "edit" ? "Preview lampiran" : "Preview lampiran baru"}
                width={800}
                height={256}
                className="w-full max-h-52 object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              {receipt.scanning && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/70 backdrop-blur-sm">
                  <Sparkles className="w-6 h-6 text-primary animate-pulse" />
                  <p className="text-sm font-medium text-white">Membaca nota...</p>
                </div>
              )}
              <button
                type="button"
                disabled={receipt.scanning}
                onClick={() => fileRef.current?.click()}
                className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full border border-border bg-card/90 px-3 py-1.5 text-xs text-foreground backdrop-blur-sm transition-colors hover:bg-accent disabled:opacity-50"
              >
                <RotateCcw className="w-3 h-3" /> Ganti foto
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex w-full items-center justify-between px-4 py-3 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <span className="flex items-center gap-2">
                <Paperclip className="h-4 w-4" />
                Tambah lampiran
              </span>
              <Plus className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* ── MORE OPTIONS ── */}
      <div className={cn("overflow-hidden", expenseCardShadow)}>
        <button
          type="button"
          onClick={() => setShowMoreOptions((v) => !v)}
          className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-accent/30"
        >
          <span>Opsi lainnya</span>
          <ChevronDown
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform duration-200",
              showMoreOptions && "rotate-180"
            )}
          />
        </button>

        {showMoreOptions && (
          <div className="space-y-4 border-t border-border p-4">
            {/* Vendor */}
            {isExpense && (
              <VendorSection
                newVendorName={newVendorName}
                selectedVendorId={selectedVendorId}
                showNewVendor={showNewVendor}
                vendors={vendors}
                onAddVendor={addNewVendor}
                onNewVendorNameChange={setNewVendorName}
                onSelectVendor={(vendorId) => setValue("vendorId", vendorId)}
                onShowNewVendorChange={setShowNewVendor}
              />
            )}

            {/* Notes */}
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Catatan <span className="normal-case text-muted-foreground">(opsional)</span>
              </p>
              <input
                {...register("notes")}
                placeholder="Catatan tambahan..."
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary"
              />
            </div>

            {isExpense && selectedWalletId && (
              <SplitBillSection
                amountValue={amountValue}
                customSplitName={splitBill.customSplitName}
                customSplitRemaining={customSplitRemaining}
                displaySplitParticipants={displaySplitParticipants}
                equalPreviewBase={equalPreviewBase}
                equalPreviewRemainder={equalPreviewRemainder}
                splitBillEnabled={splitBill.splitBillEnabled}
                splitMemberIds={splitMemberIds}
                splitMembers={splitMembers}
                splitMode={splitBill.splitMode}
                splitPaidCount={splitPaidCount}
                splitParticipantCount={splitParticipantCount}
                onAddCustomSplitParticipant={splitBill.addCustomSplitParticipant}
                onCustomSplitNameChange={splitBill.setCustomSplitName}
                onSplitBillToggle={() => splitBill.ensureCurrentProfileParticipant(currentProfile, walletMembers ?? [])}
                onSplitModeChange={splitBill.setSplitMode}
                onToggleSplitParticipant={splitBill.toggleSplitParticipant}
                onUpdateSplitParticipant={splitBill.updateSplitParticipant}
                onRemoveSplitParticipant={splitBill.removeSplitParticipant}
              />
            )}


          </div>
        )}
      </div>

      {/* ── SUBMIT ── */}
      <button
        type="submit"
        disabled={isBusy}
        className={cn(
          "w-full flex items-center justify-center h-14 rounded-2xl text-base font-semibold transition-all duration-200",
          isBusy
            ? "cursor-not-allowed bg-muted text-muted-foreground"
            : "bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.98]"
        )}
      >
        {uploading ? (
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            {mode === "edit" ? "Mengupload perubahan..." : "Mengupload lampiran..."}
          </span>
        ) : isSubmitting ? (
          mode === "edit" ? "Memperbarui..." : "Menyimpan..."
        ) : (
          mode === "edit" ? "Simpan Perubahan" : direction === "expense" ? "Simpan Pengeluaran" : "Simpan Pemasukan"
        )}
      </button>

      {/* ── CATEGORY SHEET ── */}
      <Sheet open={categorySheetOpen} onOpenChange={(open) => {
        setCategorySheetOpen(open);
        if (!open) setSheetPrimaryId(null);
      }}>
        <SheetContent side="bottom" className="max-h-[75dvh] rounded-t-3xl px-4 py-6 overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {(() => {
                if (sheetPrimaryId) {
                  const p = primaryCategories.find((c) => c._id === sheetPrimaryId);
                  return p ? `${p.icon} ${p.name}` : "Pilih Kategori";
                }
                return "Pilih Kategori";
              })()}
            </SheetTitle>
          </SheetHeader>

          {sheetPrimaryId && (
            <button
              type="button"
              onClick={() => setSheetPrimaryId(null)}
              className="mt-2 flex items-center gap-1 text-xs text-primary transition-colors hover:text-primary/80"
            >
              ← Kembali ke utama
            </button>
          )}

          <div className="relative mt-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={categorySearch}
              onChange={(e) => setCategorySearch(e.target.value)}
              placeholder="Cari kategori..."
              className="w-full rounded-xl border border-border bg-card py-2 pl-8 pr-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
            />
          </div>

          {/* Primary categories grid */}
          {!sheetPrimaryId && (
            <div className="mt-4 grid grid-cols-2 gap-3 overflow-x-hidden sm:grid-cols-3 md:grid-cols-4">
              {filteredCategories.filter((c) => !c.parentId).map((cat) => {
                const hasSubs = subCategories.some((s) => s.parentId === cat._id);
                const active = selectedCategoryId === cat._id;
                return (
                  <button
                    key={cat._id}
                    type="button"
                    onClick={() => {
                      if (hasSubs) {
                        setSheetPrimaryId(cat._id);
                      } else {
                        setValue("categoryId", cat._id, { shouldValidate: true });
                        setCategorySheetOpen(false);
                      }
                    }}
                    className={cn(
                      "rounded-2xl border p-3 text-center transition-all",
                      active ? "border-primary bg-primary/10" : "border-border hover:border-primary/30"
                    )}
                  >
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl text-2xl" style={{ backgroundColor: `${cat.color ?? "#e2e8f0"}33` }}>
                      {cat.icon ?? "📁"}
                    </div>
                    <p className="mt-2 text-xs font-medium text-foreground">{cat.name}</p>
                    {hasSubs && (
                      <p className="mt-0.5 text-[10px] text-muted-foreground">Lihat sub ›</p>
                    )}
                  </button>
                );
              })}
                <button
                  type="button"
                  onClick={handleOpenAddCategory}
                  className="rounded-2xl border border-dashed border-border p-3 text-center text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
                >
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-2xl">+</div>
                <p className="mt-2 text-xs font-medium">Tambah</p>
              </button>
            </div>
          )}

          {/* Sub-categories for selected primary */}
          {sheetPrimaryId && (
            <div className="mt-4 space-y-3">
              <button
                type="button"
                onClick={() => {
                  setValue("categoryId", sheetPrimaryId, { shouldValidate: true });
                  setCategorySheetOpen(false);
                  setSheetPrimaryId(null);
                }}
                className={cn(
                  "w-full rounded-xl border px-4 py-3 text-left text-sm transition-all",
                  selectedCategoryId === sheetPrimaryId
                    ? "border-primary bg-primary/10"
                    : "border-border bg-card hover:border-primary/30"
                )}
              >
                <span className="font-medium text-foreground">Pilih kategori utama</span>
              </button>

              {currentPrimarySubs.length > 0 && (
                <div className="grid grid-cols-2 gap-3 overflow-x-hidden sm:grid-cols-3 md:grid-cols-4">
                  {currentPrimarySubs.map((cat) => {
                    const active = selectedCategoryId === cat._id;
                    return (
                      <button
                        key={cat._id}
                        type="button"
                        onClick={() => {
                          setValue("categoryId", cat._id, { shouldValidate: true });
                          setCategorySheetOpen(false);
                          setSheetPrimaryId(null);
                        }}
                        className={cn(
                          "rounded-2xl border p-3 text-center transition-all",
                          active ? "border-primary bg-primary/10" : "border-border hover:border-primary/30"
                        )}
                      >
                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl text-2xl" style={{ backgroundColor: `${cat.color ?? "#e2e8f0"}33` }}>
                          {cat.icon ?? "📁"}
                        </div>
                        <p className="mt-2 text-xs font-medium text-foreground">{cat.name}</p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* ── PERIOD SELECTOR SHEET ── */}
      <Sheet open={periodSheetOpen} onOpenChange={setPeriodSheetOpen}>
        <SheetContent side="bottom" className="max-h-[60dvh] rounded-t-3xl px-5 py-6 overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-left text-lg font-bold">Select Period</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-2">
            {([
              { value: "day", label: "Day" },
              { value: "week", label: "Week" },
              { value: "biweekly", label: "Biweekly" },
              { value: "month", label: "Month" },
              { value: "quarterly", label: "Quarterly" },
              { value: "year", label: "Year" },
            ] as { value: RepeatPeriod; label: string }[]).map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  setRepeatPeriod(opt.value);
                  setPeriodSheetOpen(false);
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

      {/* ── UNTIL DATE PICKER ── */}
      <Sheet open={untilPickerOpen} onOpenChange={setUntilPickerOpen}>
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
                setRepeatUntil(d);
                setUntilPickerOpen(false);
              }}
              className="bg-transparent"
            />
          </div>
        </SheetContent>
      </Sheet>

        <CategoryAddSheet
          open={addCategoryOpen}
          onOpenChange={setAddCategoryOpen}
          defaultDirection={direction}
          walletId={selectedWalletId ? (selectedWalletId as Id<"wallets">) : undefined}
          onCreated={(id) => {
            setValue("categoryId", id, { shouldValidate: true });
          }}
      />
    </form>
  );
}
