"use client";

import { useEffect, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import {
  CalendarIcon,
  ChevronDown,
} from "lucide-react";

import { Calendar } from "@/components/ui/calendar";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { CategoryAddSheet } from "./CategoryAddSheet";
import { DescriptionPhotoSection } from "./DescriptionPhotoSection";
import { RecurringTransactionSection } from "./RecurringTransactionSection";
import { SplitBillSection } from "./SplitBillSection";
import { TransactionCategorySheet } from "./TransactionCategorySheet";
import { VendorSection } from "./VendorSection";
import {
  buildTransactionPayload,
  expenseCardShadow,
  formatRupiah,
  isRecurringTransactionType,
  transactionTypeOptions,
  type TransactionType,
  validateSplitBill,
} from "./transaction-helpers";
import { useTransactionReceipt } from "./use-transaction-receipt";
import { useTransactionSplitBill } from "./use-transaction-split-bill";
import { useRecurringTransaction } from "./use-recurring-transaction";
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

interface TransactionFormProps {
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

export function TransactionForm({ mode = "create", expenseId, initialExpense }: TransactionFormProps) {
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
  const splitBill = useTransactionSplitBill();
  const setInitialSplitBill = splitBill.setInitialSplitBill;
  const receipt = useTransactionReceipt({
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
      if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
      const { storageId } = await res.json();
      await registerUploadedReceipt({ storageId: storageId as Id<"_storage"> });
      return storageId as string;
    },
    extractReceipt: async (storageId) => extractReceiptAction({ storageId: storageId as Id<"_storage"> }),
  });
  const setInitialReceipt = receipt.setInitialReceipt;

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
  const descriptionValue = useWatch({ control, name: "description" }) ?? "";

  const recurring = useRecurringTransaction({
    transactionType: transactionType as TransactionType,
    selectedDate,
    setValue,
  });
  const { setRepeatEvery, setRepeatPeriod, setRepeatUntil } = recurring;

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
      setRepeatEvery(1);
      setRepeatPeriod("month");
      setRepeatUntil(null);

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
      setInitialReceipt(initialExpense.receiptUrl, initialExpense.receiptStorageId ?? null);
      setInitialSplitBill(initialExpense.splitBill);
      initializedExpenseRef.current = initialExpense._id;
    }
    initializeFromExpense();
  }, [initialExpense, mode, reset, setInitialReceipt, setInitialSplitBill, setRepeatEvery, setRepeatPeriod, setRepeatUntil]);

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
      const submitCustomRemaining = data.amount - splitBill.splitParticipants.reduce((sum, participant) => sum + participant.amount, 0);

      validateSplitBill({
        direction,
        enabled: splitBill.splitBillEnabled,
        mode: splitBill.splitMode,
        participantCount: splitParticipantCount,
        customRemaining: submitCustomRemaining,
        amount: data.amount,
      });

      const payload = buildTransactionPayload({
        direction,
        formTransactionType: data.transactionType,
        amount: data.amount,
        installmentCount: data.installmentCount,
        installmentRate: data.installmentRate,
        description: data.description,
        date: data.date,
        categoryId: data.categoryId,
        walletId: data.walletId,
        vendorId: data.vendorId,
        notes: data.notes,
        receiptStorageId,
        splitBillEnabled: splitBill.splitBillEnabled,
        splitMode: splitBill.splitMode,
        displaySplitParticipants,
      });

      if (mode === "edit") {
        if (!expenseId) throw new Error("Expense ID is required");
        await updateExpense({ id: expenseId, ...payload } as Parameters<typeof updateExpense>[0]);
        toast.success("Transaksi diperbarui!");
        router.push("/transactions");
      } else {
        await createExpense({ ...payload } as Parameters<typeof createExpense>[0]);
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

  const directionFiltered = (categories ?? []).filter((cat) =>
    (direction === "expense" ? cat.directionScope !== "income" : cat.directionScope !== "expense")
  );
  const primaryCategories = directionFiltered.filter((cat) => !cat.parentId);
  const subCategories = directionFiltered.filter((cat) => cat.parentId);
  const filteredCategories = directionFiltered.filter((cat) =>
    cat.name.toLowerCase().includes(categorySearch.toLowerCase())
  );
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
            <div className="flex items-baseline justify-end min-w-0">
              <input
                ref={amountRef}
                type="text"
                inputMode="numeric"
                value={amountDisplay ? `Rp${amountDisplay}` : ""}
                onChange={handleAmountChange}
                placeholder="Rp0"
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
          <RecurringTransactionSection
            amountValue={amountValue}
            installmentCount={installmentCount}
            installmentRate={installmentRate}
            periodSheetOpen={recurring.periodSheetOpen}
            repeatEvery={recurring.repeatEvery}
            repeatPeriod={recurring.repeatPeriod}
            repeatUntil={recurring.repeatUntil}
            untilPickerOpen={recurring.untilPickerOpen}
            onPeriodSheetOpenChange={recurring.setPeriodSheetOpen}
            onRepeatEveryChange={recurring.setRepeatEvery}
            onRepeatPeriodChange={recurring.setRepeatPeriod}
            onRepeatUntilChange={recurring.setRepeatUntil}
            onUntilPickerOpenChange={recurring.setUntilPickerOpen}
            onInstallmentRateChange={(v) => setValue("installmentRate", v, { shouldValidate: true })}
          />
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

      <DescriptionPhotoSection
        descriptionValue={descriptionValue}
        onDescriptionChange={(v) => setValue("description", v, { shouldValidate: true })}
        descriptionError={errors.description?.message}
        fileRef={fileRef}
        photoPreview={receipt.photoPreview}
        scanning={receipt.scanning}
        isEditMode={mode === "edit"}
        onPhotoChange={receipt.handlePhotoChange}
      />

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
                onSplitBillToggle={() => splitBill.ensureCurrentProfileParticipant(currentProfile, walletMembers)}
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
      <TransactionCategorySheet
        categorySearch={categorySearch}
        currentPrimarySubs={currentPrimarySubs}
        filteredCategories={filteredCategories}
        open={categorySheetOpen}
        primaryCategories={primaryCategories}
        selectedCategoryId={selectedCategoryId}
        sheetPrimaryId={sheetPrimaryId}
        subCategories={subCategories}
        onCategorySearchChange={setCategorySearch}
        onOpenAddCategory={handleOpenAddCategory}
        onOpenChange={(open) => {
          setCategorySheetOpen(open);
          if (!open) setSheetPrimaryId(null);
        }}
        onSelectCategory={(categoryId) => {
          setValue("categoryId", categoryId, { shouldValidate: true });
          setCategorySheetOpen(false);
          setSheetPrimaryId(null);
        }}
        onSelectPrimary={(categoryId) => {
          setValue("categoryId", categoryId, { shouldValidate: true });
          setCategorySheetOpen(false);
          setSheetPrimaryId(null);
        }}
        onSheetPrimaryChange={setSheetPrimaryId}
      />

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
