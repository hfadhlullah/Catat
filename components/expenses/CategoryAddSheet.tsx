"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import { Layers, Plus, SquareStack } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const PRESET_COLORS = [
  "#64748b", // slate
  "#22c55e", // green
  "#14b8a6", // teal
  "#06b6d4", // cyan
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#f43f5e", // rose
  "#f59e0b", // amber
];

const COMMON_EMOJIS = [
  "🍔","🍕","🍜","🍱","☕","🍺","🍷","🥦","🍎","🍌",
  "🚗","🚌","🚕","🛵","✈️","🚢","🚲","⛽","🛒","🏠",
  "💡","💧","🔥","❄️","📱","💻","🖥️","⌚","🎮","🎧",
  "👕","👗","👟","🎒","💍","🧴","💊","🏥","🚑","🏋️",
  "🎬","🎵","🎨","📚","✏️","🎁","🎉","🧸","🐶","🌱",
  "🧹","🔧","🛠️","🪚","🧱","🪣","🔑","📦","📮","🗑️",
  "💼","💳","💰","🏦","📈","📉","🧾","🏷️","📌","📝",
];

interface CategoryAddSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (id: Id<"categories">) => void;
  defaultDirection?: "expense" | "income";
}

export function CategoryAddSheet({
  open,
  onOpenChange,
  onCreated,
  defaultDirection = "expense",
}: CategoryAddSheetProps) {
  const categories = useQuery(api.categories.listCategories);
  const createCategory = useMutation(api.categories.createCategory);

  const [name, setName] = useState("");
  const [icon, setIcon] = useState("🙂");
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [direction, setDirection] = useState<"expense" | "income">(defaultDirection);
  const [isSub, setIsSub] = useState(false);
  const [parentId, setParentId] = useState<string>("");
  const [selectingParent, setSelectingParent] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const primaryCats = (categories ?? []).filter(
    (c) =>
      !c.parentId &&
      (direction === "expense" ? c.directionScope !== "income" : c.directionScope !== "expense")
  );
  const selectedParent = primaryCats.find((c) => c._id === parentId);

  function reset() {
    setName("");
    setIcon("🙂");
    setColor(PRESET_COLORS[0]);
    setDirection(defaultDirection);
    setIsSub(false);
    setParentId("");
    setSelectingParent(false);
    setEmojiOpen(false);
  }

  function handleClose(nextOpen: boolean) {
    if (!nextOpen) reset();
    onOpenChange(nextOpen);
  }

  async function handleSubmit() {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Masukkan nama kategori");
      return;
    }
    if (isSub && !parentId) {
      toast.error("Pilih kategori utama");
      return;
    }
    setCreating(true);
    try {
      const id = await createCategory({
        name: trimmed,
        icon: icon.trim() || undefined,
        color,
        parentId: isSub && parentId ? (parentId as Id<"categories">) : undefined,
      });
      toast.success(isSub ? "Subkategori ditambahkan" : "Kategori ditambahkan");
      onCreated(id);
      handleClose(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Gagal menambahkan");
    } finally {
      setCreating(false);
    }
  }

  // ── PARENT SELECTOR VIEW ──
  if (selectingParent) {
    return (
      <Sheet open={open} onOpenChange={handleClose}>
        <SheetContent side="bottom" className="max-h-[80dvh] rounded-t-3xl px-4 py-6 overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-left text-xl font-bold">Select Category</SheetTitle>
            <p className="text-left text-sm text-muted-foreground">
              Select the main category for this subcategory
            </p>
          </SheetHeader>

          <div className="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-4">
            {primaryCats.map((cat) => (
              <button
                key={cat._id}
                type="button"
                onClick={() => {
                  setParentId(cat._id);
                  setSelectingParent(false);
                }}
                className={cn(
                  "rounded-2xl border p-3 text-center transition-all",
                  parentId === cat._id
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/30"
                )}
              >
                <div
                  className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl text-2xl"
                  style={{ backgroundColor: `${cat.color ?? "#e2e8f0"}33` }}
                >
                  {cat.icon ?? "📁"}
                </div>
                <p className="mt-2 text-xs font-medium text-foreground">{cat.name}</p>
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  // ── ADD CATEGORY / SUBCATEGORY VIEW ──
  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent side="bottom" className="max-h-[90dvh] rounded-t-3xl px-5 py-6 overflow-y-auto">
        <SheetHeader className="mb-5">
          <SheetTitle className="text-left text-xl font-bold">
            {isSub ? "Add Subcategory" : "Add Category"}
          </SheetTitle>
        </SheetHeader>

        {/* Direction toggle */}
        <div className="grid grid-cols-2 gap-1.5 rounded-xl bg-muted/50 p-1">
          {[
            { value: "expense", label: "Expense" },
            { value: "income", label: "Income" },
          ].map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                setDirection(opt.value as typeof direction);
                setParentId("");
              }}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-medium transition-all",
                direction === opt.value
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Icon + Name */}
        <div className="mt-5 flex items-center gap-4">
          <button
            type="button"
            onClick={() => setEmojiOpen(true)}
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border text-3xl transition-colors"
            style={{ borderColor: `${color}66`, backgroundColor: `${color}1A` }}
          >
            {icon}
          </button>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name"
            className="min-w-0 flex-1 border-b-2 border-border bg-transparent pb-1 text-xl font-medium text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
          />
        </div>

        {/* Color picker */}
        <div className="mt-5 flex items-center gap-3">
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className={cn(
                "h-8 w-8 rounded-full transition-transform",
                color === c ? "scale-110 ring-2 ring-offset-2 ring-offset-card ring-foreground/30" : "hover:scale-105"
              )}
              style={{ backgroundColor: c }}
              aria-label={`Pick color ${c}`}
            />
          ))}
        </div>

        {/* Main / Sub toggle */}
        <div className="mt-6 rounded-2xl border border-border bg-card overflow-hidden">
          <button
            type="button"
            onClick={() => {
              setIsSub(false);
              setParentId("");
            }}
            className={cn(
              "flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors",
              !isSub ? "bg-muted/60" : "hover:bg-muted/30"
            )}
          >
            <Layers className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-semibold text-foreground">Main Category</p>
            </div>
            {!isSub && <div className="ml-auto h-2 w-2 rounded-full bg-primary" />}
          </button>
          <div className="border-t border-border" />
          <button
            type="button"
            onClick={() => {
              if (!isSub) {
                setIsSub(true);
                setSelectingParent(true);
              }
            }}
            className={cn(
              "flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors",
              isSub ? "bg-muted/60" : "hover:bg-muted/30"
            )}
          >
            <SquareStack className="h-5 w-5 text-muted-foreground" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">Subcategory</p>
              {isSub && selectedParent && (
                <p className="text-xs text-muted-foreground">For {selectedParent.name}</p>
              )}
            </div>
            {isSub && selectedParent && (
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-lg"
                style={{ backgroundColor: `${selectedParent.color ?? "#e2e8f0"}33` }}
              >
                {selectedParent.icon}
              </div>
            )}
            {isSub && !selectedParent && (
              <Plus className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        </div>

        {/* Submit */}
        <button
          type="button"
          disabled={creating || !name.trim() || (isSub && !parentId)}
          onClick={handleSubmit}
          className={cn(
            "mt-6 w-full rounded-2xl py-3.5 text-sm font-semibold transition-all",
            creating || !name.trim() || (isSub && !parentId)
              ? "bg-muted text-muted-foreground"
              : "bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.98]"
          )}
        >
          {creating ? "Menyimpan..." : "Set Name"}
        </button>

        {/* Emoji picker mini-sheet */}
        <Sheet open={emojiOpen} onOpenChange={setEmojiOpen}>
          <SheetContent side="bottom" className="max-h-[60dvh] rounded-t-3xl px-4 py-5 overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="text-left text-lg font-bold">Pilih Emoji</SheetTitle>
            </SheetHeader>
            <div className="mt-4 grid grid-cols-7 gap-2">
              {COMMON_EMOJIS.map((em) => (
                <button
                  key={em}
                  type="button"
                  onClick={() => {
                    setIcon(em);
                    setEmojiOpen(false);
                  }}
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-xl text-xl transition-colors",
                    icon === em ? "bg-primary/15 ring-1 ring-primary" : "hover:bg-accent"
                  )}
                >
                  {em}
                </button>
              ))}
            </div>
          </SheetContent>
        </Sheet>
      </SheetContent>
    </Sheet>
  );
}
