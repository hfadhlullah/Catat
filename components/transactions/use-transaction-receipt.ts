import { useCallback, useEffect, useState } from "react";

import { toast } from "sonner";

import { formatRupiah } from "./transaction-helpers";

type ReceiptExtraction = {
  amount: number | null;
  date: string | null;
  vendor: string | null;
  description: string | null;
};

type ReceiptHookArgs = {
  onAmountExtracted: (amount: number) => void;
  onDateExtracted: (date: Date) => void;
  onDescriptionExtracted: (description: string) => void;
  onVendorMatched: (vendorId: string) => void;
  onVendorDetected: (vendorName: string) => void;
  findVendorIdByName: (vendorName: string) => string | undefined;
  uploadReceiptFile: (file: File) => Promise<string>;
  extractReceipt: (storageId: string) => Promise<ReceiptExtraction>;
};

export function useTransactionReceipt({
  onAmountExtracted,
  onDateExtracted,
  onDescriptionExtracted,
  onVendorMatched,
  onVendorDetected,
  findVendorIdByName,
  uploadReceiptFile,
  extractReceipt,
}: ReceiptHookArgs) {
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [storageId, setStorageId] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    return () => {
      if (photoPreview?.startsWith("blob:")) {
        URL.revokeObjectURL(photoPreview);
      }
    };
  }, [photoPreview]);

  const setInitialReceipt = useCallback((receiptUrl?: string | null, receiptStorageId?: string | null) => {
    setPhoto(null);
    setPhotoPreview(receiptUrl ?? null);
    setStorageId(receiptStorageId ?? null);
  }, []);

  function applyExtraction(data: ReceiptExtraction) {
    if (data.amount && data.amount > 0) {
      onAmountExtracted(data.amount);
    }
    if (data.date) {
      const date = new Date(data.date);
      if (!Number.isNaN(date.getTime())) {
        onDateExtracted(date);
      }
    }
    if (data.description) {
      onDescriptionExtracted(data.description);
    }
    if (data.vendor) {
      const matchedVendorId = findVendorIdByName(data.vendor);
      if (matchedVendorId) {
        onVendorMatched(matchedVendorId);
      } else {
        onVendorDetected(data.vendor);
      }
    }
  }

  async function handlePhotoChange(file: File | undefined, onInputReset?: () => void) {
    if (!file) return;

    if (photoPreview?.startsWith("blob:")) {
      URL.revokeObjectURL(photoPreview);
    }

    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
    setStorageId(null);
    onInputReset?.();

    setScanning(true);
    try {
      const nextStorageId = await uploadReceiptFile(file);
      setStorageId(nextStorageId);
      const data = await extractReceipt(nextStorageId);
      applyExtraction(data);
      toast.success("Data nota terbaca, periksa kembali");
    } catch {
      toast.error("Gagal membaca nota, isi manual");
    } finally {
      setScanning(false);
    }
  }

  async function ensureReceiptStorageId() {
    if (storageId) return storageId;
    if (!photo) return null;
    const id = await uploadReceiptFile(photo);
    setStorageId(id);
    return id;
  }

  return {
    photo,
    photoPreview,
    scanning,
    storageId,
    setInitialReceipt,
    handlePhotoChange,
    ensureReceiptStorageId,
    formatExtractedAmount: (amount: number) => formatRupiah(String(amount)),
  };
}
