import { Plus, Store, X } from "lucide-react";

import { cn } from "@/lib/utils";

type Vendor = {
  _id: string;
  name: string;
};

interface VendorSectionProps {
  newVendorName: string;
  selectedVendorId?: string;
  showNewVendor: boolean;
  vendors?: Vendor[];
  onAddVendor: () => void | Promise<void>;
  onNewVendorNameChange: (value: string) => void;
  onSelectVendor: (vendorId: string | undefined) => void;
  onShowNewVendorChange: (show: boolean) => void;
}

export function VendorSection({
  newVendorName,
  selectedVendorId,
  showNewVendor,
  vendors,
  onAddVendor,
  onNewVendorNameChange,
  onSelectVendor,
  onShowNewVendorChange,
}: VendorSectionProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Vendor <span className="normal-case text-muted-foreground">(opsional)</span>
        </p>
        {!showNewVendor && (
          <button
            type="button"
            onClick={() => onShowNewVendorChange(true)}
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
              onClick={() => onSelectVendor(undefined)}
              className="flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
            >
              <X className="w-3 h-3" /> Hapus
            </button>
          )}
          {vendors?.map((vendor) => {
            const active = selectedVendorId === vendor._id;
            return (
              <button
                key={vendor._id}
                type="button"
                onClick={() => onSelectVendor(active ? undefined : vendor._id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-150",
                  active
                    ? "border-transparent bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground hover:border-primary/30"
                )}
              >
                <Store className="w-3 h-3" />
                {vendor.name}
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
            onChange={(e) => onNewVendorNameChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), onAddVendor())}
            placeholder="Nama vendor baru"
            autoFocus
            className="min-w-0 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
          />
          <div className="col-span-2 flex gap-2 sm:col-auto">
            <button
              type="button"
              onClick={() => void onAddVendor()}
              className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 sm:flex-none"
            >
              Tambah
            </button>
            <button
              type="button"
              onClick={() => onShowNewVendorChange(false)}
              className="h-10 w-10 shrink-0 rounded-lg border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <X className="mx-auto w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
