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
import { cn } from "@/lib/utils";

const schema = z.object({
  amount: z.number().min(1, "Masukkan jumlah"),
  description: z.string().min(1, "Masukkan deskripsi"),
  date: z.date(),
  categoryId: z.string().min(1, "Pilih kategori"),
  vendorId: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

function formatRupiah(value: string) {
  const num = value.replace(/\D/g, "");
  if (!num) return "";
  return new Intl.NumberFormat("id-ID").format(Number(num));
}

export function ExpenseForm() {
  const router = useRouter();
  const amountRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const categories = useQuery(api.categories.listCategories);
  const vendors = useQuery(api.vendors.listVendors);
  const createExpense = useMutation(api.expenses.createExpense);
  const generateUploadUrl = useMutation(api.expenses.generateUploadUrl);
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

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { date: new Date() },
  });

  const selectedDate = useWatch({ control, name: "date" });
  const selectedCategoryId = useWatch({ control, name: "categoryId" });
  const selectedVendorId = useWatch({ control, name: "vendorId" });

  useEffect(() => {
    amountRef.current?.focus();
  }, []);

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
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
    setStorageId(null);

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
    if (!photo) {
      toast.error("Foto nota diperlukan");
      return;
    }

    setUploading(true);
    try {
      const receiptStorageId = storageId ?? (await uploadPhoto(photo));

      await createExpense({
        amount: data.amount,
        description: data.description,
        date: data.date.getTime(),
        categoryId: data.categoryId as Id<"categories">,
        vendorId: data.vendorId ? (data.vendorId as Id<"vendors">) : undefined,
        notes: data.notes || undefined,
        receiptStorageId: receiptStorageId as Id<"_storage">,
      });

      toast.success("Pengeluaran disimpan!");
      router.push("/dashboard");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan");
    } finally {
      setUploading(false);
    }
  }

  const isBusy = isSubmitting || uploading || scanning;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="pb-6 space-y-6">

      {/* ── AMOUNT ── */}
      <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-5">
        <p className="text-xs font-medium text-zinc-500 uppercase tracking-widest mb-3">Jumlah</p>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-semibold text-zinc-400">Rp</span>
          <input
            ref={amountRef}
            type="text"
            inputMode="numeric"
            value={amountDisplay}
            onChange={handleAmountChange}
            placeholder="0"
            className="flex-1 bg-transparent text-4xl font-bold text-zinc-50 placeholder:text-zinc-700 outline-none min-w-0"
          />
        </div>
        {errors.amount && (
          <p className="mt-2 text-red-400 text-xs">{errors.amount.message}</p>
        )}
      </div>

      {/* ── CATEGORY ── */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-zinc-500 uppercase tracking-widest px-1">Kategori</p>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600 pointer-events-none" />
          <input
            type="text"
            value={categorySearch}
            onChange={(e) => setCategorySearch(e.target.value)}
            placeholder="Cari kategori..."
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-8 pr-3 py-2 text-sm text-zinc-50 placeholder:text-zinc-600 outline-none focus:border-zinc-600 transition-colors"
          />
          {categorySearch && (
            <button
              type="button"
              onClick={() => setCategorySearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Chips — native horizontal scroll for touch */}
        <div className="overflow-x-auto scrollbar-hide -mx-4 px-4">
          <div className="flex gap-2 pb-1 w-max">
            {(categories ?? [])
              .filter((cat) =>
                cat.name.toLowerCase().includes(categorySearch.toLowerCase())
              )
              .map((cat) => {
                const active = selectedCategoryId === cat._id;
                return (
                  <button
                    key={cat._id}
                    type="button"
                    onClick={() => setValue("categoryId", cat._id, { shouldValidate: true })}
                    className={cn(
                      "flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-medium whitespace-nowrap border transition-all duration-150 shrink-0",
                      active
                        ? "border-transparent text-white shadow-lg scale-105"
                        : "border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-500 hover:text-zinc-300"
                    )}
                    style={active ? { backgroundColor: cat.color ?? "#3b82f6" } : {}}
                  >
                    {cat.icon && <span className="text-base leading-none">{cat.icon}</span>}
                    {cat.name}
                  </button>
                );
              })}
            {categories !== undefined &&
              categories.filter((c) =>
                c.name.toLowerCase().includes(categorySearch.toLowerCase())
              ).length === 0 && (
                <p className="text-xs text-zinc-600 py-2">Tidak ditemukan</p>
              )}
          </div>
        </div>

        {errors.categoryId && (
          <p className="text-red-400 text-xs px-1">{errors.categoryId.message}</p>
        )}
      </div>

      {/* ── DATE & DESCRIPTION ── */}
      <div className="rounded-2xl bg-zinc-900 border border-zinc-800 divide-y divide-zinc-800">
        {/* Date */}
        <div className="p-4">
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-widest mb-2">Tanggal</p>
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-2 text-zinc-50 text-sm font-medium hover:text-zinc-300 transition-colors"
              >
                <CalendarIcon className="w-4 h-4 text-zinc-500" />
                {format(selectedDate, "EEEE, d MMMM yyyy", { locale: idLocale })}
                <ChevronDown className="w-3.5 h-3.5 text-zinc-600 ml-auto" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-zinc-900 border-zinc-700" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(d: Date | undefined) => d && setValue("date", d)}
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Description */}
        <div className="p-4">
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-widest mb-2">Deskripsi</p>
          <input
            {...register("description")}
            placeholder="Contoh: Beli semen 10 sak"
            className="w-full bg-transparent text-sm text-zinc-50 placeholder:text-zinc-600 outline-none"
          />
          {errors.description && (
            <p className="mt-1 text-red-400 text-xs">{errors.description.message}</p>
          )}
        </div>
      </div>

      {/* ── VENDOR ── */}
      <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-widest">
            Vendor <span className="normal-case text-zinc-700">(opsional)</span>
          </p>
          {!showNewVendor && (
            <button
              type="button"
              onClick={() => setShowNewVendor(true)}
              className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
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
                className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs border border-zinc-700 text-zinc-500 hover:border-zinc-500 transition-colors"
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
                      ? "bg-blue-600 border-transparent text-white"
                      : "border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-500"
                  )}
                >
                  <Store className="w-3 h-3" />
                  {v.name}
                </button>
              );
            })}
            {vendors?.length === 0 && (
              <p className="text-xs text-zinc-600">Belum ada vendor. Tambah di atas.</p>
            )}
          </div>
        )}

        {/* New vendor input */}
        {showNewVendor && (
          <div className="flex gap-2">
            <input
              value={newVendorName}
              onChange={(e) => setNewVendorName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addNewVendor())}
              placeholder="Nama vendor baru"
              autoFocus
              className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-50 placeholder:text-zinc-600 outline-none focus:border-blue-600 transition-colors"
            />
            <button
              type="button"
              onClick={addNewVendor}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
            >
              Tambah
            </button>
            <button
              type="button"
              onClick={() => setShowNewVendor(false)}
              className="p-2 rounded-lg border border-zinc-700 text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* ── PHOTO ── */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-zinc-500 uppercase tracking-widest px-1">
          Foto Nota <span className="text-red-400 normal-case">*</span>
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
          <div className="relative rounded-2xl overflow-hidden border border-zinc-700">
            <Image
              src={photoPreview}
              alt="preview"
              width={800}
              height={256}
              className="w-full max-h-64 object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            {scanning && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/70 backdrop-blur-sm">
                <Sparkles className="w-6 h-6 text-blue-400 animate-pulse" />
                <p className="text-sm font-medium text-zinc-100">Membaca nota...</p>
              </div>
            )}
            <button
              type="button"
              disabled={scanning}
              onClick={() => fileRef.current?.click()}
              className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-zinc-900/90 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs text-zinc-300 border border-zinc-700 hover:border-zinc-500 transition-colors disabled:opacity-50"
            >
              <RotateCcw className="w-3 h-3" /> Ganti foto
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="w-full h-36 flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-zinc-700 text-zinc-600 hover:border-blue-600 hover:text-blue-500 transition-all duration-200 active:scale-[0.98]"
          >
            <div className="w-12 h-12 rounded-2xl bg-zinc-800 flex items-center justify-center">
              <ImagePlus className="w-6 h-6" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium">Ambil / pilih foto nota</p>
              <p className="text-xs text-zinc-700 mt-0.5">JPG, PNG hingga 10MB</p>
            </div>
          </button>
        )}
      </div>

      {/* ── NOTES ── */}
      <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-4">
        <p className="text-xs font-medium text-zinc-500 uppercase tracking-widest mb-2">
          Catatan <span className="normal-case text-zinc-700">(opsional)</span>
        </p>
        <input
          {...register("notes")}
          placeholder="Catatan tambahan..."
          className="w-full bg-transparent text-sm text-zinc-50 placeholder:text-zinc-600 outline-none"
        />
      </div>

      {/* ── SUBMIT ── */}
      <button
        type="submit"
        disabled={isBusy}
        className={cn(
          "w-full flex items-center justify-center h-14 rounded-2xl text-base font-semibold text-white transition-all duration-200",
          isBusy
            ? "bg-zinc-700 cursor-not-allowed"
            : "bg-blue-600 hover:bg-blue-500 active:scale-[0.98] shadow-lg shadow-blue-900/30"
        )}
      >
        {uploading ? (
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Mengupload foto...
          </span>
        ) : isSubmitting ? (
          "Menyimpan..."
        ) : (
          "Simpan Pengeluaran"
        )}
      </button>
    </form>
  );
}
