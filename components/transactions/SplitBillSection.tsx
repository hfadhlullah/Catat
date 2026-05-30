import { X } from "lucide-react";
import { haptics } from "@/hooks/use-haptics";

import { formatIDR } from "@/lib/currency";
import { cn } from "@/lib/utils";

import type { DisplaySplitParticipant, SplitMode, SplitParticipant } from "./transaction-helpers";

type WalletMember = {
  userId: string;
  name: string;
};

interface SplitBillSectionProps {
  amountValue: number;
  customSplitName: string;
  customSplitRemaining: number;
  displaySplitParticipants: DisplaySplitParticipant[];
  equalPreviewBase: number;
  equalPreviewRemainder: number;
  splitBillEnabled: boolean;
  splitMemberIds: Set<string>;
  splitMembers: WalletMember[];
  splitMode: SplitMode;
  splitPaidCount: number;
  splitParticipantCount: number;
  onAddCustomSplitParticipant: () => void;
  onCustomSplitNameChange: (value: string) => void;
  onSplitBillToggle: () => void;
  onSplitModeChange: (mode: SplitMode) => void;
  onToggleSplitParticipant: (member: WalletMember) => void;
  onUpdateSplitParticipant: (id: string, updates: Partial<SplitParticipant>) => void;
  onRemoveSplitParticipant: (id: string) => void;
}

export function SplitBillSection({
  amountValue,
  customSplitName,
  customSplitRemaining,
  displaySplitParticipants,
  equalPreviewBase,
  equalPreviewRemainder,
  splitBillEnabled,
  splitMemberIds,
  splitMembers,
  splitMode,
  splitPaidCount,
  splitParticipantCount,
  onAddCustomSplitParticipant,
  onCustomSplitNameChange,
  onSplitBillToggle,
  onSplitModeChange,
  onToggleSplitParticipant,
  onUpdateSplitParticipant,
  onRemoveSplitParticipant,
}: SplitBillSectionProps) {
  return (
    <div className="space-y-3 rounded-2xl border border-border bg-background/70 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Split bill</p>
          <p className="mt-1 text-sm text-foreground">Bagi transaksi ke anggota wallet atau nama lain di luar keluarga.</p>
        </div>
        <button
          type="button"
          onClick={() => { haptics.light(); onSplitBillToggle(); }}
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
                onClick={() => onSplitModeChange(option.value as SplitMode)}
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
                const active = splitMemberIds.has(member.userId);
                return (
                  <button
                    key={member.userId}
                    type="button"
                    onClick={() => onToggleSplitParticipant(member)}
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
                onChange={(e) => onCustomSplitNameChange(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), onAddCustomSplitParticipant())}
                placeholder="Mis. John, Driver, Office"
                className="min-w-0 rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary"
              />
              <button
                type="button"
                onClick={onAddCustomSplitParticipant}
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
                      onChange={(e) => onUpdateSplitParticipant(participant.id, { amount: Math.max(0, Math.round(Number(e.target.value) || 0)) })}
                      className={cn(
                        "rounded-lg border border-border bg-background px-2 py-1.5 text-right text-sm text-foreground outline-none focus:border-primary",
                        splitMode === "equal" && "text-muted-foreground"
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => onUpdateSplitParticipant(participant.id, { isPaid: !participant.isPaid })}
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
                      onClick={() => onRemoveSplitParticipant(participant.id)}
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
  );
}
