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
  Store,
  X,
} from "lucide-react";

import { Calendar } from "@/components/ui/calendar";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { CategoryAddSheet } from "./CategoryAddSheet";
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

type SplitParticipant = {
  id: string;
  userId?: string;
  name: string;
  amount: number;
  isPaid: boolean;
  paidAt?: number;
};

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

function formatRupiah(value: string) {
  const num = value.replace(/\D/g, "");
  if (!num) return "";
  return new Intl.NumberFormat("id-ID").format(Number(num));
}

const cardShadow = "rounded-2xl border border-border bg-card p-4 shadow-[2px_3px_0px_0px_rgba(0,0,0,0.06)] dark:shadow-[2px_3px_0px_0px_rgba(255,255,255,0.06)]";
const transactionTypeOptions = [
  { value: "default", label: "Default" },
  { value: "upcoming", label: "Upcoming" },
  { value: "subscription", label: "Subscription" },
  { value: "repetitive", label: "Repetitive" },
  { value: "lent", label: "Lent" },
  { value: "borrowed", label: "Borrowed" },
] as const;

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
  const generateUploadUrl = useMutation(api.transactions.generateUploadUrl);
  const registerUploadedReceipt = useMutation(api.transactions.registerUploadedReceipt);
  const ensureDefaultCategories = useMutation(api.categories.ensureDefaultCategories);
  const createVendor = useMutation(api.vendors.createVendor);
  const extractReceipt = useAction(api.ocr.extractReceipt);

  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [storageId, setStorageId] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newVendorName, setNewVendorName] = useState("");
  const [showNewVendor, setShowNewVendor] = useState(false);
  const [amountDisplay, setAmountDisplay] = useState("");
  const [categorySearch, setCategorySearch] = useState("");
  const [direction, setDirection] = useState<"expense" | "income">("expense");
  const [transactionType, setTransactionType] = useState<(typeof transactionTypeOptions)[number]["value"]>("default");
  const [categorySheetOpen, setCategorySheetOpen] = useState(false);
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [sheetPrimaryId, setSheetPrimaryId] = useState<string | null>(null);
  const [addCategoryOpen, setAddCategoryOpen] = useState(false);
  const [repeatEvery, setRepeatEvery] = useState(1);
  const [repeatPeriod, setRepeatPeriod] = useState<"day" | "week" | "biweekly" | "month" | "quarterly" | "year">("month");
  const [repeatUntil, setRepeatUntil] = useState<Date | null>(null);
  const [periodSheetOpen, setPeriodSheetOpen] = useState(false);
  const [untilPickerOpen, setUntilPickerOpen] = useState(false);
  const [splitBillEnabled, setSplitBillEnabled] = useState(false);
  const [splitMode, setSplitMode] = useState<"equal" | "custom">("equal");
  const [splitParticipants, setSplitParticipants] = useState<SplitParticipant[]>([]);
  const [customSplitName, setCustomSplitName] = useState("");

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
      setPhoto(null);
      setPhotoPreview(initialExpense.receiptUrl ?? null);
      setStorageId(initialExpense.receiptStorageId ?? null);
      setSplitBillEnabled(initialExpense.splitBill?.enabled ?? false);
      setSplitMode(initialExpense.splitBill?.mode ?? "equal");
      setSplitParticipants((initialExpense.splitBill?.participants ?? []).map((participant) => ({
        id: participant.userId ? `member:${participant.userId}` : `custom:${participant.name.trim().toLowerCase()}`,
        userId: participant.userId,
        name: participant.name,
        amount: participant.amount,
        isPaid: Boolean(participant.isPaid),
        paidAt: participant.paidAt,
      })));
      initializedExpenseRef.current = initialExpense._id;
    }
    initializeFromExpense();
  }, [initialExpense, mode, reset]);

  useEffect(() => {
    return () => {
      if (photoPreview?.startsWith("blob:")) {
        URL.revokeObjectURL(photoPreview);
      }
    };
  }, [photoPreview]);

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
      setSplitBillEnabled(false);
    }
  }

  function handleWalletChange(walletId: string) {
    setValue("walletId", walletId, { shouldValidate: true });
    setValue("categoryId", undefined, { shouldValidate: true });
    setSheetPrimaryId(null);
    setSplitParticipants((current) => current.filter((participant) => !participant.userId));
  }

  function toggleSplitParticipant(member: { userId: string; name: string }) {
    setSplitParticipants((current) => {
      const memberId = `member:${member.userId}`;
      const exists = current.some((participant) => participant.id === memberId);
      if (exists) {
        return current.filter((participant) => participant.id !== memberId);
      }
      return [...current, { id: memberId, userId: member.userId, name: member.name, amount: 0, isPaid: false }];
    });
  }

  function addCustomSplitParticipant() {
    const name = customSplitName.trim();
    if (!name) return;
    const id = `custom:${name.toLowerCase()}`;
    setSplitParticipants((current) => {
      if (current.some((participant) => participant.id === id)) return current;
      return [...current, { id, name, amount: 0, isPaid: false }];
    });
    setCustomSplitName("");
  }

  function updateSplitParticipant(id: string, updates: Partial<SplitParticipant>) {
    setSplitParticipants((current) => current.map((participant) => {
      if (participant.id !== id) return participant;
      const nextIsPaid = updates.isPaid ?? participant.isPaid;
      return {
        ...participant,
        ...updates,
        isPaid: nextIsPaid,
        paidAt: nextIsPaid ? (updates.paidAt ?? participant.paidAt ?? Date.now()) : undefined,
      };
    }));
  }

  function removeSplitParticipant(id: string) {
    setSplitParticipants((current) => current.filter((participant) => participant.id !== id));
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

  async function uploadPhoto(file: File): Promise<string> {
    const uploadUrl = await generateUploadUrl();
    const res = await fetch(uploadUrl, {
      method: "POST",
      headers: { "Content-Type": file.type },
      body: file,
    });
    const { storageId } = await res.json();
    await registerUploadedReceipt({ storageId: storageId as Id<"_storage"> });
    return storageId as string;
  }

  function applyExtraction(data: {
    amount: number | null;
    date: string | null;
    vendor: string | null;
    description: string | null;
  }) {
    if (data.amount && data.amount > 0) {
      setAmountDisplay(formatRupiah(String(data.amount)));
      setValue("amount", data.amount, { shouldValidate: true });
    }
    if (data.date) {
      const d = new Date(data.date);
      if (!isNaN(d.getTime())) setValue("date", d);
    }
    if (data.description) {
      setValue("description", data.description, { shouldValidate: true });
    }
    if (data.vendor) {
      const match = vendors?.find(
        (v) => v.name.toLowerCase() === data.vendor!.toLowerCase()
      );
      if (match) {
        setValue("vendorId", match._id);
      } else {
        setNewVendorName(data.vendor);
        setShowNewVendor(true);
      }
    }
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (photoPreview?.startsWith("blob:")) {
      URL.revokeObjectURL(photoPreview);
    }

    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
    setStorageId(null);
    if (fileRef.current) fileRef.current.value = "";

    setScanning(true);
    try {
      const id = await uploadPhoto(file);
      setStorageId(id);
      const data = await extractReceipt({ storageId: id as Id<"_storage"> });
      applyExtraction(data);
      toast.success("Data nota terbaca, periksa kembali");
    } catch {
      toast.error("Gagal membaca nota, isi manual");
    } finally {
      setScanning(false);
    }
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

      const receiptStorageId = storageId ?? (photo ? await uploadPhoto(photo) : null);

      const splitParticipantCount = splitParticipants.length;
      const equalPreviewBase = splitParticipantCount > 0 ? Math.floor(data.amount / splitParticipantCount) : 0;
      const equalPreviewRemainder = splitParticipantCount > 0 ? data.amount - equalPreviewBase * splitParticipantCount : 0;
      const customSplitRemaining = data.amount - splitParticipants.reduce((sum, participant) => sum + participant.amount, 0);

      if (splitBillEnabled) {
        if (direction !== "expense") {
          throw new Error("Split bill hanya untuk pengeluaran");
        }
        if (splitParticipantCount < 2) {
          throw new Error("Split bill minimal 2 peserta");
        }
        if (splitMode === "equal" && data.amount < splitParticipantCount) {
          throw new Error("Jumlah transaksi terlalu kecil untuk split rata");
        }
        if (splitMode === "custom" && customSplitRemaining !== 0) {
          throw new Error("Total split bill harus sama dengan jumlah transaksi");
        }
      }

      const payload = {
        direction,
        transactionType: data.transactionType as "default" | "upcoming" | "subscription" | "repetitive" | "lent" | "borrowed",
        amount: data.amount,
        installmentCount: (data.transactionType === "subscription" || data.transactionType === "repetitive") ? data.installmentCount : 1,
        installmentRate: (data.transactionType === "subscription" || data.transactionType === "repetitive") ? data.installmentRate : 0,
        description: data.description,
        date: data.date.getTime(),
        categoryId: data.categoryId ? (data.categoryId as Id<"categories">) : undefined,
        walletId: data.walletId as Id<"wallets">,
        vendorId: direction === "expense" && data.vendorId ? (data.vendorId as Id<"vendors">) : undefined,
        notes: data.notes || undefined,
        receiptStorageId: receiptStorageId ? (receiptStorageId as Id<"_storage">) : undefined,
        splitBill: direction === "expense" && splitBillEnabled ? {
          enabled: true,
          mode: splitMode,
          participants: displaySplitParticipants.map((participant, index) => ({
            userId: participant.userId ? (participant.userId as Id<"userProfiles">) : undefined,
            name: participant.name,
            amount: splitMode === "equal"
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

  const isBusy = isSubmitting || uploading || scanning;

  // Sync installmentCount when repeat config changes
  useEffect(() => {
    if (transactionType !== "subscription" && transactionType !== "repetitive") return;
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

  const repeatPeriodLabels: Record<string, string> = {
    day: "day",
    week: "week",
    biweekly: "biweekly",
    month: "month",
    quarterly: "quarterly",
    year: "year",
  };

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
  const splitMemberNameMap = new Map(splitMembers.map((member) => [String(member.userId), member.name]));
  const splitParticipantCount = splitParticipants.length;
  const equalPreviewBase = splitParticipantCount > 0 ? Math.floor(amountValue / splitParticipantCount) : 0;
  const equalPreviewRemainder = splitParticipantCount > 0 ? amountValue - equalPreviewBase * splitParticipantCount : 0;
  const customSplitTotal = splitParticipants.reduce((sum, participant) => sum + participant.amount, 0);
  const customSplitRemaining = amountValue - customSplitTotal;
  const splitPaidCount = splitParticipants.filter((participant) => participant.isPaid).length;
  const displaySplitParticipants = splitParticipants.map((participant) => ({
    ...participant,
    name: participant.userId ? (splitMemberNameMap.get(participant.userId) ?? participant.name) : participant.name,
  }));

  const currentPrimarySubs = sheetPrimaryId
    ? subCategories.filter((cat) => cat.parentId === sheetPrimaryId)
    : [];

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="pb-6 space-y-5">
      {/* ── DIRECTION + CATEGORY + AMOUNT + DATE ── */}
      <div className={cn(cardShadow, "overflow-hidden p-4")}>
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
      <div className={cn("space-y-3 p-4", cardShadow)}>
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
        {(transactionType === "subscription" || transactionType === "repetitive") && (
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
      <div className={cn("overflow-hidden", cardShadow)}>
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
            onChange={handlePhotoChange}
            className="hidden"
          />
          {photoPreview ? (
            <div className="relative">
              <Image
                src={photoPreview}
                alt={mode === "edit" ? "Preview lampiran" : "Preview lampiran baru"}
                width={800}
                height={256}
                className="w-full max-h-52 object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              {scanning && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/70 backdrop-blur-sm">
                  <Sparkles className="w-6 h-6 text-primary animate-pulse" />
                  <p className="text-sm font-medium text-white">Membaca nota...</p>
                </div>
              )}
              <button
                type="button"
                disabled={scanning}
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
      <div className={cn("overflow-hidden", cardShadow)}>
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
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Vendor <span className="normal-case text-muted-foreground">(opsional)</span>
                  </p>
                  {!showNewVendor && (
                    <button
                      type="button"
                      onClick={() => setShowNewVendor(true)}
                      className="flex items-center gap-1 text-xs text-primary transition-colors hover:text-primary/80"
                    >
                      <Plus className="w-3 h-3" /> Vendor baru
                    </button>
                  )}
                </div>

                {!showNewVendor && (
                  <div className="flex flex-wrap gap-2">
                    {selectedVendorId && (
                      <button
                        type="button"
                        onClick={() => setValue("vendorId", undefined)}
                        className="flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
                      >
                        <X className="w-3 h-3" /> Hapus
                      </button>
                    )}
                    {vendors?.map((v) => {
                      const active = selectedVendorId === v._id;
                      return (
                        <button
                          key={v._id}
                          type="button"
                          onClick={() => setValue("vendorId", active ? undefined : v._id)}
                          className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-150",
                            active
                              ? "border-transparent bg-primary text-primary-foreground"
                              : "border-border bg-background text-muted-foreground hover:border-primary/30"
                          )}
                        >
                          <Store className="w-3 h-3" />
                          {v.name}
                        </button>
                      );
                    })}
                    {vendors?.length === 0 && (
                      <p className="text-xs text-muted-foreground">Belum ada vendor. Tambah di atas.</p>
                    )}
                  </div>
                )}

                {showNewVendor && (
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
                    <input
                      value={newVendorName}
                      onChange={(e) => setNewVendorName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addNewVendor())}
                      placeholder="Nama vendor baru"
                      autoFocus
                      className="min-w-0 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
                    />
                    <div className="col-span-2 flex gap-2 sm:col-auto">
                      <button
                        type="button"
                        onClick={addNewVendor}
                        className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 sm:flex-none"
                      >
                        Tambah
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowNewVendor(false)}
                        className="h-10 w-10 shrink-0 rounded-lg border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                      >
                        <X className="mx-auto w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
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
              <div className="space-y-3 rounded-2xl border border-border bg-background/70 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Split bill</p>
                    <p className="mt-1 text-sm text-foreground">Bagi transaksi ke anggota wallet atau nama lain di luar keluarga.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const nextValue = !splitBillEnabled;
                      setSplitBillEnabled(nextValue);
                      if (nextValue && splitParticipants.length === 0 && currentProfile && walletMembers) {
                        const self = walletMembers.find((member) => member.userId === currentProfile._id);
                        if (self) {
                          setSplitParticipants([{ id: `member:${self.userId}`, userId: self.userId, name: self.name, amount: 0, isPaid: false }]);
                        }
                      }
                    }}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-150",
                      splitBillEnabled
                        ? "border-transparent bg-primary text-primary-foreground"
                        : "border-border bg-card text-muted-foreground hover:border-primary/30"
                    )}
                  >
                    {splitBillEnabled ? "Aktif" : "Nonaktif"}
                  </button>
                </div>

                {splitBillEnabled && (
                  <div className="space-y-4">
                    <div className="flex gap-2 rounded-xl bg-muted/40 p-1">
                      {[
                        { value: "equal", label: "Rata" },
                        { value: "custom", label: "Custom" },
                      ].map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setSplitMode(option.value as typeof splitMode)}
                          className={cn(
                            "flex-1 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
                            splitMode === option.value
                              ? "bg-card text-foreground shadow-sm"
                              : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Anggota wallet</p>
                      <div className="flex flex-wrap gap-2">
                        {splitMembers.map((member) => {
                          const active = splitParticipants.some((participant) => participant.userId === member.userId);
                          return (
                            <button
                              key={member.userId}
                              type="button"
                              onClick={() => toggleSplitParticipant(member)}
                              className={cn(
                                "rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-150",
                                active
                                  ? "border-transparent bg-primary text-primary-foreground"
                                  : "border-border bg-card text-muted-foreground hover:border-primary/30"
                              )}
                            >
                              {member.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Tambah nama lain</p>
                      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
                        <input
                          value={customSplitName}
                          onChange={(e) => setCustomSplitName(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustomSplitParticipant())}
                          placeholder="Mis. John, Driver, Office"
                          className="min-w-0 rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary"
                        />
                        <button
                          type="button"
                          onClick={addCustomSplitParticipant}
                          className="rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition-colors hover:border-primary/30"
                        >
                          Tambah
                        </button>
                      </div>
                    </div>

                    {displaySplitParticipants.length > 0 && (
                      <div className="space-y-2 rounded-xl border border-dashed border-border bg-card/60 p-3">
                        {displaySplitParticipants.map((participant, index) => {
                          const equalAmount = splitParticipantCount > 0
                            ? equalPreviewBase + (index < equalPreviewRemainder ? 1 : 0)
                            : 0;
                          return (
                            <div key={participant.id} className="grid grid-cols-[minmax(0,1fr)_88px_auto_auto] items-center gap-2">
                              <div>
                                <p className="text-sm font-medium text-foreground">{participant.name}</p>
                                <p className="text-[11px] text-muted-foreground">
                                  {participant.userId ? "Anggota wallet" : "Peserta manual"}
                                </p>
                              </div>
                              <input
                                type="number"
                                min={0}
                                step={1}
                                inputMode="numeric"
                                value={splitMode === "equal" ? equalAmount : participant.amount}
                                disabled={splitMode === "equal"}
                                onChange={(e) => updateSplitParticipant(participant.id, { amount: Math.max(0, Math.round(Number(e.target.value) || 0)) })}
                                className={cn(
                                  "rounded-lg border border-border bg-background px-2 py-1.5 text-right text-sm text-foreground outline-none focus:border-primary",
                                  splitMode === "equal" && "text-muted-foreground"
                                )}
                              />
                              <button
                                type="button"
                                onClick={() => updateSplitParticipant(participant.id, { isPaid: !participant.isPaid })}
                                className={cn(
                                  "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                                  participant.isPaid
                                    ? "border-transparent bg-emerald-500 text-white"
                                    : "border-border bg-background text-muted-foreground hover:border-primary/30"
                                )}
                              >
                                {participant.isPaid ? "Paid" : "Belum"}
                              </button>
                              <button
                                type="button"
                                onClick={() => removeSplitParticipant(participant.id)}
                                className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition-colors hover:border-destructive/30 hover:text-destructive"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <div className="rounded-xl border border-border bg-card px-3 py-3 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-muted-foreground">Peserta</span>
                        <span className="font-medium text-foreground">{splitParticipantCount} orang</span>
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-3">
                        <span className="text-muted-foreground">Status bayar</span>
                        <span className="font-medium text-foreground">{splitPaidCount}/{splitParticipantCount} paid</span>
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-3">
                        <span className="text-muted-foreground">Validasi split</span>
                        <span className={cn(
                          "font-medium",
                          splitParticipantCount < 2 || (splitMode === "equal" && amountValue < splitParticipantCount) || (splitMode === "custom" && customSplitRemaining !== 0)
                            ? "text-destructive"
                            : "text-foreground"
                        )}>
                          {splitParticipantCount < 2
                            ? "Minimal 2 peserta"
                            : splitMode === "equal" && amountValue < splitParticipantCount
                              ? "Jumlah terlalu kecil"
                            : splitMode === "custom"
                              ? customSplitRemaining === 0
                                ? "Pas"
                                : `${customSplitRemaining > 0 ? "Kurang" : "Lebih"} ${formatIDR(Math.abs(customSplitRemaining))}`
                              : "Otomatis rata"}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
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
            ] as { value: typeof repeatPeriod; label: string }[]).map((opt) => (
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
