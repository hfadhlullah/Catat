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
  ImagePlus,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  Store,
  X,
} from "lucide-react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { formatIDR } from "@/lib/currency";
import { cn } from "@/lib/utils";

const schema = z.object({
  amount: z.number().min(1, "Masukkan jumlah"),
  installmentCount: z.number().int().min(1, "Minimal 1x"),
  installmentRate: z.number().min(0, "Minimal 0%"),
  description: z.string().min(1, "Masukkan deskripsi"),
  date: z.date(),
  categoryId: z.string().min(1, "Pilih kategori"),
  walletId: z.string().optional(),
  vendorId: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface ExpenseFormProps {
  mode?: "create" | "edit";
  expenseId?: Id<"expenses">;
  initialExpense?: {
    _id: Id<"expenses">;
    amount: number;
    installmentCount?: number;
    installmentRate?: number;
    description: string;
    date: number;
    categoryId: Id<"categories">;
    walletId?: Id<"wallets">;
    vendorId?: Id<"vendors">;
    notes?: string;
    receiptStorageId?: Id<"_storage">;
    receiptUrl?: string | null;
  };
}

function formatRupiah(value: string) {
  const num = value.replace(/\D/g, "");
  if (!num) return "";
  return new Intl.NumberFormat("id-ID").format(Number(num));
}

const cardShadow = "rounded-2xl border border-border bg-card p-4 shadow-[2px_3px_0px_0px_rgba(0,0,0,0.06)] dark:shadow-[2px_3px_0px_0px_rgba(255,255,255,0.06)]";

export function ExpenseForm({ mode = "create", expenseId, initialExpense }: ExpenseFormProps) {
  const router = useRouter();
  const amountRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const initializedExpenseRef = useRef<string | null>(null);

  const categories = useQuery(api.categories.listCategories);
  const wallets = useQuery(api.wallets.listWallets);
  const vendors = useQuery(api.vendors.listVendors);
  const createExpense = useMutation(api.expenses.createExpense);
  const updateExpense = useMutation(api.expenses.updateExpense);
  const generateUploadUrl = useMutation(api.expenses.generateUploadUrl);
  const registerUploadedReceipt = useMutation(api.expenses.registerUploadedReceipt);
  const createCategory = useMutation(api.categories.createCategory);
  const createVendor = useMutation(api.vendors.createVendor);
  const extractReceipt = useAction(api.ocr.extractReceipt);

  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [storageId, setStorageId] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryIcon, setNewCategoryIcon] = useState("");
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newVendorName, setNewVendorName] = useState("");
  const [showNewVendor, setShowNewVendor] = useState(false);
  const [amountDisplay, setAmountDisplay] = useState("");
  const [categorySearch, setCategorySearch] = useState("");
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { date: new Date(), installmentCount: 1, installmentRate: 0 },
  });

  const selectedDate = useWatch({ control, name: "date" });
  const selectedCategoryId = useWatch({ control, name: "categoryId" });
  const selectedWalletId = useWatch({ control, name: "walletId" });
  const selectedVendorId = useWatch({ control, name: "vendorId" });
  const installmentCount = useWatch({ control, name: "installmentCount" }) ?? 1;
  const installmentRate = useWatch({ control, name: "installmentRate" }) ?? 0;
  const amountValue = useWatch({ control, name: "amount" }) ?? 0;

  useEffect(() => {
    if (mode === "create") {
      amountRef.current?.focus();
    }
  }, [mode]);

  useEffect(() => {
    if (mode !== "edit" || !initialExpense) return;
    if (initializedExpenseRef.current === initialExpense._id) return;

    reset({
      amount: initialExpense.amount,
      installmentCount: initialExpense.installmentCount ?? 1,
      installmentRate: initialExpense.installmentRate ?? 0,
      description: initialExpense.description,
      date: new Date(initialExpense.date),
      categoryId: initialExpense.categoryId,
      walletId: initialExpense.walletId,
      vendorId: initialExpense.vendorId,
      notes: initialExpense.notes ?? "",
    });
    setAmountDisplay(formatRupiah(String(initialExpense.amount)));
    setPhoto(null);
    setPhotoPreview(initialExpense.receiptUrl ?? null);
    setStorageId(initialExpense.receiptStorageId ?? null);
    initializedExpenseRef.current = initialExpense._id;
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

  async function addNewCategory() {
    if (!newCategoryName.trim()) return;
    setCreatingCategory(true);
    try {
      const id = await createCategory({
        name: newCategoryName.trim(),
        icon: newCategoryIcon.trim() || undefined,
      });
      setValue("categoryId", id, { shouldValidate: true });
      setCategorySearch("");
      setNewCategoryName("");
      setNewCategoryIcon("");
      setShowNewCategory(false);
      toast.success("Kategori ditambahkan");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Gagal menambahkan kategori");
    } finally {
      setCreatingCategory(false);
    }
  }

  async function onSubmit(data: FormValues) {
    setUploading(true);
    try {
      const receiptStorageId = storageId ?? (photo ? await uploadPhoto(photo) : null);

      const payload = {
        amount: data.amount,
        installmentCount: data.installmentCount,
        installmentRate: data.installmentRate,
        description: data.description,
        date: data.date.getTime(),
        categoryId: data.categoryId as Id<"categories">,
        walletId: data.walletId ? (data.walletId as Id<"wallets">) : undefined,
        vendorId: data.vendorId ? (data.vendorId as Id<"vendors">) : undefined,
        notes: data.notes || undefined,
        receiptStorageId: receiptStorageId ? (receiptStorageId as Id<"_storage">) : undefined,
      };

      if (mode === "edit") {
        if (!expenseId) throw new Error("Expense ID is required");
        await updateExpense({ id: expenseId, ...payload });
        toast.success("Pengeluaran diperbarui!");
        router.push("/expenses");
      } else {
        await createExpense(payload);
        toast.success("Pengeluaran disimpan!");
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
  const filteredCategories = (categories ?? []).filter((cat) =>
    cat.name.toLowerCase().includes(categorySearch.toLowerCase())
  );
  const totalWithInterest = Math.round(amountValue * (1 + installmentRate / 100));
  const perInstallment = installmentCount > 0 ? Math.round(totalWithInterest / installmentCount) : 0;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="pb-6 space-y-5">

      {/* ── AMOUNT ── */}
      <div className={cn("relative p-5", cardShadow)}>
        <div className="absolute -top-2 left-6 h-4 w-16 bg-primary/20 border border-primary/30 rounded-sm -rotate-1 z-10" />

        <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Jumlah</p>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-semibold text-muted-foreground">Rp</span>
          <input
            ref={amountRef}
            type="text"
            inputMode="numeric"
            value={amountDisplay}
            onChange={handleAmountChange}
            placeholder="0"
            className="min-w-0 flex-1 bg-transparent text-4xl font-semibold text-foreground outline-none placeholder:text-muted-foreground"
          />
        </div>
        {errors.amount && (
          <p className="mt-2 text-xs text-destructive">{errors.amount.message}</p>
        )}
      </div>

      <div className={cn("grid gap-3 p-4 sm:grid-cols-2", cardShadow)}>
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Cicilan</p>
          <input
            type="number"
            min={1}
            step={1}
            {...register("installmentCount", { valueAsNumber: true })}
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
          />
          <p className="mt-1 text-xs text-muted-foreground">Isi `1` untuk pembayaran langsung.</p>
          {errors.installmentCount && (
            <p className="mt-1 text-xs text-destructive">{errors.installmentCount.message}</p>
          )}
        </div>
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Bunga Cicilan (%)</p>
          <input
            type="number"
            min={0}
            step="0.01"
            {...register("installmentRate", { valueAsNumber: true })}
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
          />
          <p className="mt-1 text-xs text-muted-foreground">Gunakan `0` untuk cicilan tanpa bunga tambahan.</p>
          {errors.installmentRate && (
            <p className="mt-1 text-xs text-destructive">{errors.installmentRate.message}</p>
          )}
        </div>

        {amountValue > 0 && installmentCount > 1 && (
          <div className="sm:col-span-2 rounded-xl border border-dashed border-border bg-background/60 px-3 py-3 text-sm">
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

      <div className={cn("space-y-3 p-4", cardShadow)}>
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Wallet <span className="normal-case text-muted-foreground">(opsional)</span>
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {selectedWalletId && (
            <button
              type="button"
              onClick={() => setValue("walletId", undefined)}
              className="flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
            >
              <X className="w-3 h-3" /> Hapus
            </button>
          )}
          {wallets?.map((wallet) => {
            const active = selectedWalletId === wallet._id;
            return (
              <button
                key={wallet._id}
                type="button"
                onClick={() => setValue("walletId", active ? undefined : wallet._id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-150",
                  active
                    ? "border-transparent bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground hover:border-primary/30"
                )}
              >
                {wallet.name}
              </button>
            );
          })}
          {wallets?.length === 0 && (
            <p className="text-xs text-muted-foreground">Belum ada wallet. Tambah dari halaman Wallet.</p>
          )}
        </div>
      </div>

      {/* ── CATEGORY ── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Kategori</p>
          {!showNewCategory && (
            <button
              type="button"
              onClick={() => setShowNewCategory(true)}
              className="flex items-center gap-1 text-xs text-primary transition-colors hover:text-primary/80"
            >
              <Plus className="w-3 h-3" /> Kategori baru
            </button>
          )}
        </div>

        {showNewCategory && (
          <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 px-1 sm:flex sm:flex-wrap">
            <input
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addNewCategory())}
              placeholder="Nama kategori"
              autoFocus
              disabled={creatingCategory}
               className="min-w-0 rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary sm:min-w-[12rem] sm:flex-1"
            />
             <div className="flex min-w-0 items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 sm:min-w-[10rem]">
              <span className="text-lg leading-none" aria-hidden="true">
                {newCategoryIcon.trim() || "🙂"}
              </span>
              <input
                value={newCategoryIcon}
                onChange={(e) => setNewCategoryIcon(e.target.value)}
                placeholder="Select Emoji"
                disabled={creatingCategory}
                className="w-24 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
            </div>
            <div className="col-span-2 flex gap-2 sm:col-auto">
              <button
                type="button"
                disabled={creatingCategory}
                onClick={addNewCategory}
                className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 sm:flex-none"
              >
                {creatingCategory ? "Menambah..." : "Tambah"}
              </button>
              <button
                type="button"
                disabled={creatingCategory}
                onClick={() => {
                  setNewCategoryName("");
                  setNewCategoryIcon("");
                  setShowNewCategory(false);
                }}
                className="h-10 w-10 shrink-0 rounded-lg border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
              >
                <X className="mx-auto w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={categorySearch}
            onChange={(e) => setCategorySearch(e.target.value)}
            placeholder="Cari kategori..."
            className="w-full rounded-xl border border-border bg-card py-2 pl-8 pr-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
          />
          {categorySearch && (
            <button
              type="button"
              onClick={() => setCategorySearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Chips — native horizontal scroll for touch */}
        <div className="overflow-x-auto scrollbar-hide -mx-4 px-4">
          <div className="flex gap-2 pb-1 w-max">
            {filteredCategories.map((cat) => {
                const active = selectedCategoryId === cat._id;
                return (
                  <button
                    key={cat._id}
                    type="button"
                    onClick={() => setValue("categoryId", cat._id, { shouldValidate: true })}
                    className={cn(
                      "flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-medium whitespace-nowrap border transition-all duration-150 shrink-0",
                      active
                        ? "border-transparent text-primary-foreground shadow-lg scale-105"
                        : "border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground"
                    )}
                    style={active ? { backgroundColor: cat.color ?? "#3b82f6" } : {}}
                  >
                    {cat.icon && <span className="text-base leading-none">{cat.icon}</span>}
                    {cat.name}
                  </button>
                );
              })}
            {categories !== undefined && categories.length === 0 && (
              <p className="py-2 text-xs text-muted-foreground">Belum ada kategori. Tambah di atas.</p>
            )}
            {categories !== undefined && categories.length > 0 && filteredCategories.length === 0 && (
              <p className="py-2 text-xs text-muted-foreground">Tidak ditemukan</p>
            )}
          </div>
        </div>

        {errors.categoryId && (
          <p className="px-1 text-xs text-destructive">{errors.categoryId.message}</p>
        )}
      </div>

      {/* ── DATE & DESCRIPTION ── */}
      <div className={cn("divide-y divide-border", cardShadow)}>
        {/* Date */}
        <div className="p-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Tanggal</p>
          <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-2 text-sm font-medium text-foreground transition-colors hover:text-primary"
              >
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                {format(selectedDate, "EEEE, d MMMM yyyy", { locale: idLocale })}
                <ChevronDown className="ml-auto h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto border-border bg-popover p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(d: Date | undefined) => {
                  if (!d) return;
                  setValue("date", d);
                  setDatePickerOpen(false);
                }}
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Description */}
        <div className="p-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Deskripsi</p>
          <input
            {...register("description")}
            placeholder="Contoh: Beli semen 10 sak"
            className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
          {errors.description && (
            <p className="mt-1 text-xs text-destructive">{errors.description.message}</p>
          )}
        </div>
      </div>

      {/* ── VENDOR ── */}
      <div className={cn("space-y-3 p-4", cardShadow)}>
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

        {/* Vendor chips */}
        {!showNewVendor && (
          <div className="flex flex-wrap gap-2">
            {/* Clear chip */}
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

        {/* New vendor input */}
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

      {/* ── PHOTO ── */}
      <div className="space-y-2">
        <p className="px-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Foto Nota
        </p>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handlePhotoChange}
          className="hidden"
        />
        {photoPreview ? (
          <div className={cn("relative overflow-hidden", cardShadow)}>
             <Image
               src={photoPreview}
               alt={mode === "edit" ? "Preview nota pengeluaran" : "Preview nota baru"}
              width={800}
              height={256}
              className="w-full max-h-64 object-cover"
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
            className="flex h-36 w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border text-muted-foreground transition-all duration-200 hover:border-primary hover:text-primary active:scale-[0.98]"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary">
              <ImagePlus className="w-6 h-6" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium">Ambil / pilih foto nota (opsional)</p>
              <p className="mt-0.5 text-xs text-muted-foreground">JPG, PNG hingga 10MB</p>
            </div>
          </button>
        )}
      </div>

      {/* ── NOTES ── */}
      <div className={cn("p-4", cardShadow)}>
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Catatan <span className="normal-case text-muted-foreground">(opsional)</span>
        </p>
        <input
          {...register("notes")}
          placeholder="Catatan tambahan..."
          className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
        />
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
            {mode === "edit" ? "Mengupload perubahan..." : "Mengupload foto..."}
          </span>
        ) : isSubmitting ? (
          mode === "edit" ? "Memperbarui..." : "Menyimpan..."
        ) : (
          mode === "edit" ? "Simpan Perubahan" : "Simpan Pengeluaran"
        )}
      </button>
    </form>
  );
}
