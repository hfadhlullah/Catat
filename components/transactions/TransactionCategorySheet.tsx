import { Search } from "lucide-react";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type Category = {
  _id: string;
  name: string;
  icon?: string;
  color?: string;
  parentId?: string;
};

interface TransactionCategorySheetProps {
  categorySearch: string;
  currentPrimarySubs: Category[];
  filteredCategories: Category[];
  open: boolean;
  primaryCategories: Category[];
  selectedCategoryId?: string;
  sheetPrimaryId: string | null;
  subCategories: Category[];
  onCategorySearchChange: (value: string) => void;
  onOpenAddCategory: () => void;
  onOpenChange: (open: boolean) => void;
  onSelectCategory: (categoryId: string) => void;
  onSelectPrimary: (categoryId: string) => void;
  onSheetPrimaryChange: (categoryId: string | null) => void;
}

export function TransactionCategorySheet({
  categorySearch,
  currentPrimarySubs,
  filteredCategories,
  open,
  primaryCategories,
  selectedCategoryId,
  sheetPrimaryId,
  subCategories,
  onCategorySearchChange,
  onOpenAddCategory,
  onOpenChange,
  onSelectCategory,
  onSelectPrimary,
  onSheetPrimaryChange,
}: TransactionCategorySheetProps) {
  const title = (() => {
    if (!sheetPrimaryId) return "Pilih Kategori";
    const category = primaryCategories.find((item) => item._id === sheetPrimaryId);
    return category ? `${category.icon} ${category.name}` : "Pilih Kategori";
  })();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[75dvh] rounded-t-3xl px-4 py-6 overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>

        {sheetPrimaryId && (
          <button
            type="button"
            onClick={() => onSheetPrimaryChange(null)}
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
            onChange={(e) => onCategorySearchChange(e.target.value)}
            placeholder="Cari kategori..."
            className="w-full rounded-xl border border-border bg-card py-2 pl-8 pr-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
          />
        </div>

        {!sheetPrimaryId && (
          <div className="mt-4 grid grid-cols-2 gap-3 overflow-x-hidden sm:grid-cols-3 md:grid-cols-4">
            <button
              type="button"
              onClick={onOpenAddCategory}
              className="rounded-2xl border border-dashed border-border p-3 text-center text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
            >
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-2xl">+</div>
              <p className="mt-2 text-xs font-medium">Tambah</p>
            </button>
            {filteredCategories.filter((category) => !category.parentId).map((category) => {
              const hasSubs = subCategories.some((subCategory) => subCategory.parentId === category._id);
              const active = selectedCategoryId === category._id;
              return (
                <button
                  key={category._id}
                  type="button"
                  onClick={() => {
                    if (hasSubs) {
                      onSheetPrimaryChange(category._id);
                    } else {
                      onSelectCategory(category._id);
                    }
                  }}
                  className={cn(
                    "rounded-2xl border p-3 text-center transition-all",
                    active ? "border-primary bg-primary/10" : "border-border hover:border-primary/30"
                  )}
                >
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl text-2xl" style={{ backgroundColor: `${category.color ?? "#e2e8f0"}33` }}>
                    {category.icon ?? "📁"}
                  </div>
                  <p className="mt-2 text-xs font-medium text-foreground">{category.name}</p>
                  {hasSubs && <p className="mt-0.5 text-[10px] text-muted-foreground">Lihat sub ›</p>}
                </button>
              );
            })}
          </div>
        )}

        {sheetPrimaryId && (
          <div className="mt-4 space-y-3">
            <button
              type="button"
              onClick={() => onSelectPrimary(sheetPrimaryId)}
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
                {currentPrimarySubs.map((category) => {
                  const active = selectedCategoryId === category._id;
                  return (
                    <button
                      key={category._id}
                      type="button"
                      onClick={() => onSelectCategory(category._id)}
                      className={cn(
                        "rounded-2xl border p-3 text-center transition-all",
                        active ? "border-primary bg-primary/10" : "border-border hover:border-primary/30"
                      )}
                    >
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl text-2xl" style={{ backgroundColor: `${category.color ?? "#e2e8f0"}33` }}>
                        {category.icon ?? "📁"}
                      </div>
                      <p className="mt-2 text-xs font-medium text-foreground">{category.name}</p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
