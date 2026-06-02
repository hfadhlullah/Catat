"use client";

import { FormEvent, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { format } from "date-fns";
import { Pencil, Plus, Trash2, Users, UserPlus, X } from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";

import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { formatIDR, formatIDRCompact } from "@/lib/currency";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const cardCls =
  "rounded-2xl border border-border bg-card shadow-[2px_3px_0px_0px_rgba(0,0,0,0.06)] dark:shadow-[2px_3px_0px_0px_rgba(255,255,255,0.06)]";

const WALLET_OPTIONS = [
  { name: "BCA", logo: "bca.svg" },
  { name: "BluePay", logo: "bluepay.svg" },
  { name: "BNI", logo: "bni.svg" },
  { name: "BRI", logo: "bri.svg" },
  { name: "Bukopin", logo: "bukopin.svg" },
  { name: "CIMB", logo: "cimb.svg" },
  { name: "Dana", logo: "dana.svg" },
  { name: "Danamon", logo: "danamon.svg" },
  { name: "Digibank", logo: "digibank.svg" },
  { name: "GoPay", logo: "gopay.svg" },
  { name: "HSBC", logo: "hsbc.svg" },
  { name: "JCB", logo: "jcb.svg" },
  { name: "Jenius", logo: "jenius.svg" },
  { name: "Mandiri", logo: "mandiri.svg" },
  { name: "Ovo", logo: "ovo.svg" },
  { name: "Panin", logo: "panin.svg" },
  { name: "PayPal", logo: "paypall.svg" },
  { name: "PermataBank", logo: "permatabank.svg" },
  { name: "Visa", logo: "visa.svg" },
  { name: "Cash", logo: "cash.svg" },
];

function parseAmount(value: string) {
  const raw = value.replace(/\D/g, "");
  return raw ? Number(raw) : 0;
}

function formatAmountInput(value: string) {
  const amount = parseAmount(value);
  return amount ? new Intl.NumberFormat("id-ID").format(amount) : "";
}

function BankPickerGrid({
  selected,
  onSelect,
}: {
  selected: { name: string; logo: string } | null;
  onSelect: (b: { name: string; logo: string }) => void;
}) {
  return (
    <div className="grid grid-cols-5 gap-2 max-h-64 overflow-y-auto pr-1">
      {WALLET_OPTIONS.map((bank) => (
        <button
          key={bank.logo}
          type="button"
          onClick={() => onSelect(bank)}
          className={cn(
            "flex flex-col items-center gap-1 rounded-xl border px-2 py-3 text-center transition-all duration-150",
            selected?.logo === bank.logo
              ? "border-primary bg-primary/10 text-primary"
              : "border-border bg-background text-muted-foreground hover:border-primary/30"
          )}
        >
          <Image src={`/bank-logo/${bank.logo}`} alt={bank.name} width={24} height={24} className="h-6 w-6 object-contain" />
          <span className="text-[10px] font-medium">{bank.name}</span>
        </button>
      ))}
    </div>
  );
}

export function WebWallets() {
  const period = format(new Date(), "yyyy-MM");
  const overview = useQuery(api.wallets.getWalletOverview, { period });
  const [selectedWalletId, setSelectedWalletId] = useState<string>("");
  const effectiveSelectedWalletId = selectedWalletId || overview?.wallets[0]?._id || "";
  const selectedWallet = overview?.wallets.find((w) => w._id === effectiveSelectedWalletId) ?? overview?.wallets[0];

  const members = useQuery(
    api.walletSharing.listMembers,
    effectiveSelectedWalletId ? { walletId: effectiveSelectedWalletId as Id<"wallets"> } : "skip"
  );
  const currentProfile = useQuery(api.profile.getCurrentProfileQuery);
  const createWallet = useMutation(api.wallets.createWallet);
  const updateWallet = useMutation(api.wallets.updateWallet);
  const deleteWallet = useMutation(api.wallets.deleteWallet);
  const upsertBudget = useMutation(api.walletBudgets.upsertWalletBudget);
  const deleteBudget = useMutation(api.walletBudgets.deleteWalletBudget);
  const inviteMember = useMutation(api.walletSharing.inviteMember);
  const removeMember = useMutation(api.walletSharing.removeMember);

  // Create wallet form
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedBank, setSelectedBank] = useState<{ name: string; logo: string } | null>(null);
  const [walletLabel, setWalletLabel] = useState("");
  const [walletBalanceInput, setWalletBalanceInput] = useState("");
  const [savingWallet, setSavingWallet] = useState(false);

  // Edit wallet form
  const [editOpen, setEditOpen] = useState(false);
  const [editBank, setEditBank] = useState<{ name: string; logo: string } | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  // Budget form
  const [budgetAmountInput, setBudgetAmountInput] = useState("");
  const [budgetAmountInputWalletId, setBudgetAmountInputWalletId] = useState("");
  const [savingBudget, setSavingBudget] = useState(false);

  // Sharing
  const [shareOpen, setShareOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [sendingInvite, setSendingInvite] = useState(false);
  const [removingMember, setRemovingMember] = useState(false);

  // Delete confirms
  const [confirmDeleteWallet, setConfirmDeleteWallet] = useState(false);
  const [deletingWallet, setDeletingWallet] = useState(false);
  const [confirmDeleteBudget, setConfirmDeleteBudget] = useState(false);
  const [deletingBudget, setDeletingBudget] = useState(false);

  const budgetAmountInputValue =
    budgetAmountInputWalletId === selectedWallet?._id
      ? budgetAmountInput
      : selectedWallet?.budgetAmount
        ? new Intl.NumberFormat("id-ID").format(selectedWallet.budgetAmount)
        : "";

  async function handleCreateWallet(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedBank) { toast.error("Pilih bank dulu"); return; }
    setSavingWallet(true);
    try {
      await createWallet({ name: selectedBank.name, label: walletLabel || undefined, logo: selectedBank.logo, initialBalance: parseAmount(walletBalanceInput) });
      setSelectedBank(null); setWalletLabel(""); setWalletBalanceInput(""); setCreateOpen(false);
      toast.success("Wallet ditambahkan");
    } catch (err) { toast.error(err instanceof Error ? err.message : "Gagal menambah wallet"); }
    finally { setSavingWallet(false); }
  }

  async function handleEditWallet(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedWallet || !editBank) return;
    setSavingEdit(true);
    try {
      await updateWallet({ id: selectedWallet._id as Id<"wallets">, name: editBank.name, label: editLabel || undefined, logo: editBank.logo });
      setEditOpen(false); toast.success("Wallet diperbarui");
    } catch (err) { toast.error(err instanceof Error ? err.message : "Gagal memperbarui wallet"); }
    finally { setSavingEdit(false); }
  }

  async function handleSaveBudget(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedWallet) return;
    setSavingBudget(true);
    try {
      await upsertBudget({ walletId: selectedWallet._id as Id<"wallets">, period, amount: parseAmount(budgetAmountInputValue) });
      setBudgetAmountInput(new Intl.NumberFormat("id-ID").format(parseAmount(budgetAmountInputValue)));
      setBudgetAmountInputWalletId(selectedWallet._id);
      toast.success("Budget wallet disimpan");
    } catch (err) { toast.error(err instanceof Error ? err.message : "Gagal menyimpan budget"); }
    finally { setSavingBudget(false); }
  }

  async function handleDeleteWallet() {
    if (!selectedWallet) return;
    setDeletingWallet(true);
    try {
      await deleteWallet({ id: selectedWallet._id as Id<"wallets"> });
      setConfirmDeleteWallet(false); setSelectedWalletId(""); toast.success("Wallet dihapus");
    } catch (err) { toast.error(err instanceof Error ? err.message : "Gagal menghapus wallet"); }
    finally { setDeletingWallet(false); }
  }

  async function handleDeleteBudget() {
    if (!selectedWallet?.budgetId) return;
    setDeletingBudget(true);
    try {
      await deleteBudget({ id: selectedWallet.budgetId as Id<"walletBudgets"> });
      setBudgetAmountInput(""); setBudgetAmountInputWalletId(""); setConfirmDeleteBudget(false);
      toast.success("Budget dihapus");
    } catch (err) { toast.error(err instanceof Error ? err.message : "Gagal menghapus budget"); }
    finally { setDeletingBudget(false); }
  }

  async function handleInvite(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedWallet) return;
    setSendingInvite(true);
    try {
      await inviteMember({ walletId: selectedWallet._id as Id<"wallets">, email: inviteEmail.trim() });
      setInviteEmail(""); toast.success("Undangan dikirim");
    } catch (err) { toast.error(err instanceof Error ? err.message : "Gagal mengirim undangan"); }
    finally { setSendingInvite(false); }
  }

  async function handleRemoveMember(memberUserId: string) {
    if (!selectedWallet) return;
    setRemovingMember(true);
    try {
      await removeMember({ walletId: selectedWallet._id as Id<"wallets">, memberUserId: memberUserId as Id<"userProfiles"> });
      toast.success("Anggota dikeluarkan");
    } catch (err) { toast.error(err instanceof Error ? err.message : "Gagal mengeluarkan anggota"); }
    finally { setRemovingMember(false); }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="inline-block -rotate-1 rounded-md bg-primary px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-primary-foreground">
            Wallet
          </span>
          <h1 className="text-2xl font-bold text-card-foreground">Kelola Wallet</h1>
        </div>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition-all hover:bg-primary/90 active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" />
          Tambah Wallet
        </button>
      </div>

      {/* KPI row */}
      {overview && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total Saldo", value: formatIDRCompact(overview.totalBalance) },
            { label: "Income Bulan Ini", value: formatIDRCompact(overview.totalMonthIncome) },
            { label: "Expense Bulan Ini", value: formatIDRCompact(overview.totalMonthExpense) },
          ].map(({ label, value }) => (
            <div key={label} className={cn(cardCls, "p-5")}>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
              <p className="mt-2 text-2xl font-semibold text-card-foreground">{value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[280px_1fr]">
        {/* Left: wallet card list */}
        <div className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Semua Wallet</p>
          {overview === undefined ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl bg-muted" />)}
            </div>
          ) : overview.wallets.length === 0 ? (
            <div className={cn(cardCls, "p-6 text-center text-sm text-muted-foreground")}>
              Belum ada wallet. Tekan Tambah Wallet.
            </div>
          ) : (
            overview.wallets.map((wallet) => {
              const active = wallet._id === selectedWallet?._id;
              return (
                <button
                  key={wallet._id}
                  type="button"
                  onClick={() => setSelectedWalletId(wallet._id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition-all duration-150",
                    active ? "border-primary bg-primary/5 shadow-sm" : "border-border bg-card hover:border-primary/30"
                  )}
                >
                  {wallet.logo ? (
                    <Image src={`/bank-logo/${wallet.logo}`} alt={wallet.name} width={32} height={32} className="h-8 w-8 object-contain" />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-xs font-bold text-muted-foreground">W</div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">{wallet.label || wallet.name}</p>
                    <p className="text-xs text-muted-foreground">{formatIDRCompact(wallet.balance)}</p>
                  </div>
                  {active && <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />}
                </button>
              );
            })
          )}
        </div>

        {/* Right: selected wallet detail */}
        {selectedWallet ? (
          <div className="space-y-5">
            <div className={cn(cardCls, "p-5")}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  {selectedWallet.logo && (
                    <Image src={`/bank-logo/${selectedWallet.logo}`} alt={selectedWallet.name} width={40} height={40} className="h-10 w-10 object-contain" />
                  )}
                  <div>
                    <p className="text-lg font-semibold text-foreground">{selectedWallet.label || selectedWallet.name}</p>
                    <p className="text-sm text-muted-foreground">Saldo {formatIDR(selectedWallet.balance)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => { setEditBank(WALLET_OPTIONS.find((b) => b.logo === selectedWallet.logo) ?? null); setEditLabel(selectedWallet.label ?? ""); setEditOpen(true); }}
                    className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    aria-label="Edit wallet"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  {selectedWallet.createdBy === currentProfile?._id && (
                    <button
                      type="button"
                      onClick={() => setShareOpen(true)}
                      className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                      aria-label="Bagikan wallet"
                    >
                      <Users className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteWallet(true)}
                    className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    aria-label="Hapus wallet"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-4">
                <div className="rounded-xl bg-muted/60 px-4 py-3">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Income Bulan Ini</p>
                  <p className="mt-1 text-base font-semibold text-emerald-600 dark:text-emerald-400">{formatIDRCompact(selectedWallet.monthIncome)}</p>
                </div>
                <div className="rounded-xl bg-muted/60 px-4 py-3">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Expense Bulan Ini</p>
                  <p className="mt-1 text-base font-semibold text-destructive">{formatIDRCompact(selectedWallet.monthExpense)}</p>
                </div>
              </div>

              {selectedWallet.budgetAmount > 0 && (
                <div className="mt-4">
                  <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span>Budget {formatIDR(selectedWallet.budgetAmount)}</span>
                    <div className="flex items-center gap-2">
                      <span>Sisa {formatIDR(selectedWallet.budgetRemaining)}</span>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteBudget(true)}
                        disabled={deletingBudget}
                        className="rounded p-0.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                        aria-label="Hapus budget"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${selectedWallet.budgetUsedPct}%` }} />
                  </div>
                </div>
              )}
            </div>

            {/* Budget form */}
            <form onSubmit={handleSaveBudget} className={cn(cardCls, "p-5 space-y-3")}>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Budget Wallet Bulan Ini</p>
              <div className="flex gap-2">
                <input
                  value={budgetAmountInputValue}
                  onChange={(e) => { setBudgetAmountInputWalletId(selectedWallet._id); setBudgetAmountInput(formatAmountInput(e.target.value)); }}
                  placeholder={`Budget ${period}`}
                  inputMode="numeric"
                  className="flex-1 rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground"
                  required
                />
                <button
                  type="submit"
                  disabled={savingBudget}
                  className="rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
                >
                  {savingBudget ? "..." : "Simpan"}
                </button>
              </div>
            </form>

            {/* Members */}
            {members && members.length > 1 && (
              <div className={cn(cardCls, "p-5 space-y-3")}>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Anggota Wallet</p>
                {members.map((member) => (
                  <div key={member.userId} className="flex items-center justify-between rounded-xl border border-border bg-background/60 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                        {member.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm text-foreground">{member.name}</p>
                        <p className="text-[10px] text-muted-foreground">{member.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                        {member.role === "owner" ? "Pemilik" : "Anggota"}
                      </span>
                      {selectedWallet.createdBy === currentProfile?._id && member.role !== "owner" && (
                        <button
                          type="button"
                          onClick={() => handleRemoveMember(member.userId)}
                          disabled={removingMember}
                          className="rounded p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                          aria-label="Keluarkan"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : overview !== undefined && overview.wallets.length === 0 ? null : (
          <div className={cn(cardCls, "flex items-center justify-center p-16 text-sm text-muted-foreground")}>
            Pilih wallet di sebelah kiri.
          </div>
        )}
      </div>

      {/* Create wallet dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl border-border bg-card text-card-foreground sm:rounded-2xl">
          <DialogHeader>
            <DialogTitle>Tambah Wallet</DialogTitle>
            <DialogDescription>Tambahkan sumber dana baru.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateWallet} className="space-y-4">
            <BankPickerGrid selected={selectedBank} onSelect={setSelectedBank} />
            <input value={walletLabel} onChange={(e) => setWalletLabel(e.target.value)} placeholder="Label (opsional)" className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground" />
            <input value={walletBalanceInput} onChange={(e) => setWalletBalanceInput(formatAmountInput(e.target.value))} placeholder="Saldo awal (opsional)" inputMode="numeric" className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground" />
            <button type="submit" disabled={savingWallet || !selectedBank} className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground disabled:opacity-50">
              {savingWallet ? "Menyimpan..." : "Simpan Wallet"}
            </button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit wallet dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl border-border bg-card text-card-foreground sm:rounded-2xl">
          <DialogHeader>
            <DialogTitle>Edit Wallet</DialogTitle>
            <DialogDescription>Ganti bank atau sumber dana wallet ini.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditWallet} className="space-y-4">
            <BankPickerGrid selected={editBank} onSelect={setEditBank} />
            <input value={editLabel} onChange={(e) => setEditLabel(e.target.value)} placeholder="Label (opsional)" className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground" />
            <button type="submit" disabled={savingEdit || !editBank} className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground disabled:opacity-50">
              {savingEdit ? "Menyimpan..." : "Simpan Perubahan"}
            </button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Share dialog */}
      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="max-w-md border-border bg-card text-card-foreground sm:rounded-2xl">
          <DialogHeader>
            <DialogTitle>Bagikan Wallet</DialogTitle>
            <DialogDescription>
              Undang anggota ke wallet <span className="font-medium text-foreground">{selectedWallet?.label || selectedWallet?.name}</span>.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleInvite} className="flex gap-2">
            <input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="Email anggota" className="flex-1 rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground" required />
            <button type="submit" disabled={sendingInvite || !inviteEmail.trim()} className="rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50">
              <UserPlus className="h-4 w-4" />
            </button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete wallet confirm */}
      <Dialog open={confirmDeleteWallet} onOpenChange={setConfirmDeleteWallet}>
        <DialogContent className="max-w-sm border-border bg-card text-card-foreground sm:rounded-2xl">
          <DialogHeader>
            <DialogTitle>Hapus Wallet</DialogTitle>
            <DialogDescription>
              Yakin ingin menghapus wallet <span className="font-medium text-foreground">{selectedWallet?.label || selectedWallet?.name}</span>? Tidak bisa dikembalikan.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2">
            <button type="button" onClick={() => setConfirmDeleteWallet(false)} className="flex-1 rounded-xl border border-border bg-background px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-accent">Batal</button>
            <button type="button" onClick={handleDeleteWallet} disabled={deletingWallet} className="flex-1 rounded-xl bg-destructive px-4 py-3 text-sm font-medium text-destructive-foreground transition-colors hover:bg-destructive/90 disabled:opacity-50">
              {deletingWallet ? "Menghapus..." : "Hapus"}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete budget confirm */}
      <Dialog open={confirmDeleteBudget} onOpenChange={setConfirmDeleteBudget}>
        <DialogContent className="max-w-sm border-border bg-card text-card-foreground sm:rounded-2xl">
          <DialogHeader>
            <DialogTitle>Hapus Budget</DialogTitle>
            <DialogDescription>
              Yakin ingin menghapus budget <span className="font-medium text-foreground">{formatIDR(selectedWallet?.budgetAmount ?? 0)}</span>?
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2">
            <button type="button" onClick={() => setConfirmDeleteBudget(false)} className="flex-1 rounded-xl border border-border bg-background px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-accent">Batal</button>
            <button type="button" onClick={handleDeleteBudget} disabled={deletingBudget} className="flex-1 rounded-xl bg-destructive px-4 py-3 text-sm font-medium text-destructive-foreground transition-colors hover:bg-destructive/90 disabled:opacity-50">
              {deletingBudget ? "Menghapus..." : "Hapus"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
