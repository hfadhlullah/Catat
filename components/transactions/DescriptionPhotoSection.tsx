"use client";

import Image from "next/image";
import {
  FileText,
  Paperclip,
  Plus,
  RotateCcw,
  Sparkles,
} from "lucide-react";

import { expenseCardShadow } from "./transaction-helpers";

interface DescriptionPhotoSectionProps {
  descriptionValue: string;
  onDescriptionChange: (value: string) => void;
  descriptionError?: string;
  fileRef: React.RefObject<HTMLInputElement | null>;
  photoPreview: string | null;
  scanning: boolean;
  isEditMode: boolean;
  onPhotoChange: (file: File | undefined, resetInput: () => void) => void;
}

export function DescriptionPhotoSection({
  descriptionValue,
  onDescriptionChange,
  descriptionError,
  fileRef,
  photoPreview,
  scanning,
  isEditMode,
  onPhotoChange,
}: DescriptionPhotoSectionProps) {
  return (
    <div className={`overflow-hidden ${expenseCardShadow}`}>
      <div className="p-4">
        <div className="flex items-start gap-2 min-w-0">
          <textarea
            value={descriptionValue}
            onChange={(e) => onDescriptionChange(e.target.value)}
            placeholder="Deskripsi transaksi..."
            rows={1}
            className="min-h-[2.5rem] w-full resize-none bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
          <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        </div>
        {descriptionError && (
          <p className="mt-1 text-xs text-destructive">{descriptionError}</p>
        )}
      </div>

      <div className="border-t border-border" />
      <div className="p-0">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(e) => onPhotoChange(e.target.files?.[0], () => {
            if (fileRef.current) fileRef.current.value = "";
          })}
          className="hidden"
        />
        {photoPreview ? (
          <div className="relative">
            <Image
              src={photoPreview}
              alt={isEditMode ? "Preview lampiran" : "Preview lampiran baru"}
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
  );
}
