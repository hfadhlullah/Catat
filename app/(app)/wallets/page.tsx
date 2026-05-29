"use client";

import { FormEvent, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { CalendarIcon, ChevronDown, Pencil, Plus, Trash2, Users, UserPlus, X } from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";

import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { formatIDR } from "@/lib/currency";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const cardShadow = "rounded-2xl border border-border bg-card p-4 shadow-[2px_3px_0px_0px_rgba(0,0,0,0.06)] dark:shadow-[2px_3px_0px_0px_rgba(255,255,255,0.06)]";

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

function WalletFolderTabs({
  wallets,
  selectedWalletId,
  onSelect,
}: {
  wallets: Array<{
    _id: string;
    name: string;
    label?: string;
    logo?: string;
    balance: number;
    monthIncome: number;
    monthExpense: number;
    budgetAmount: number;
    budgetRemaining: number;
  }>;
  selectedWalletId: string;
  onSelect: (walletId: string) => void;
}) {
  if (wallets.length === 0) {
    return <p className="text-sm text-muted-foreground">Belum ada wallet aktif.</p>;
  }

  return (
    <div className="overflow-x-auto scrollbar-hide -mx-4">
      <div className="flex w-max items-end gap-2 px-4">
        {wallets.map((wallet) => {
          const active = selectedWalletId === wallet._id;
          return (
            <button
              key={wallet._id}
              type="button"
              onClick={() => onSelect(wallet._id)}
              className={cn(
                "min-w-[9rem] shrink-0 rounded-t-2xl border border-b-0 px-4 py-3 text-left transition-all duration-200",
                active
                  ? "bg-card text-foreground shadow-[2px_0px_0px_0px_rgba(0,0,0,0.05)] dark:shadow-[2px_0px_0px_0px_rgba(255,255,255,0.05)]"
                  : "bg-muted/70 text-muted-foreground hover:bg-muted"
              )}
            >
              {wallet.logo ? (
                <Image
                  src={`/bank-logo/${wallet.logo}`}
                  alt={wallet.name}
                  width={20}
                  height={20}
                  className="h-5 w-auto object-contain"
                />
              ) : (
                <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Wallet</p>
              )}
              <p className="mt-1 text-sm font-semibold">{wallet.label || wallet.name}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function parseAmount(value: string) {
  const raw = value.replace(/\D/g, "");
  return raw ? Number(raw) : 0;
}

function formatAmountInput(value: string) {
  const amount = parseAmount(value);
  return amount ? new Intl.NumberFormat("id-ID").format(amount) : "";
}

export default function WalletsPage() {
  const period = format(new Date(), "yyyy-MM");
  const overview = useQuery(api.wallets.getWalletOverview, { period });
  const [selectedWalletId, setSelectedWalletId] = useState<string>("");
  const effectiveSelectedWalletId = selectedWalletId || overview?.wallets[0]?._id || "";
  const incomes = useQuery(
    api.incomes.listWalletIncomes,
    effectiveSelectedWalletId ? { walletId: effectiveSelectedWalletId as Id<"wallets"> } : "skip"
  );

  const members = useQuery(
    api.walletSharing.listMembers,
    effectiveSelectedWalletId ? { walletId: effectiveSelectedWalletId as Id<"wallets"> } : "skip"
  );
  const currentProfile = useQuery(api.profile.getCurrentProfileQuery);
  const createWallet = useMutation(api.wallets.createWallet);
  const updateWallet = useMutation(api.wallets.updateWallet);
  const deleteWallet = useMutation(api.wallets.deleteWallet);
  const createIncome = useMutation(api.incomes.createIncome);
  const upsertBudget = useMutation(api.walletBudgets.upsertWalletBudget);
  const deleteBudget = useMutation(api.walletBudgets.deleteWalletBudget);
  const inviteMember = useMutation(api.walletSharing.inviteMember);
  const removeMember = useMutation(api.walletSharing.removeMember);

  const [selectedBank, setSelectedBank] = useState<{ name: string; logo: string } | null>(null);
  const [walletLabel, setWalletLabel] = useState("");
  const [walletBalanceInput, setWalletBalanceInput] = useState("");
  const [incomeDescription, setIncomeDescription] = useState("");
  const [incomeAmountInput, setIncomeAmountInput] = useState("");
  const [incomeDate, setIncomeDate] = useState(new Date());
  const [incomeDatePickerOpen, setIncomeDatePickerOpen] = useState(false);
  const [budgetAmountInput, setBudgetAmountInput] = useState("");
  const [budgetAmountInputWalletId, setBudgetAmountInputWalletId] = useState("");
  const [walletDialogOpen, setWalletDialogOpen] = useState(false);
  const [editWalletDialogOpen, setEditWalletDialogOpen] = useState(false);
  const [editBank, setEditBank] = useState<{ name: string; logo: string } | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [savingWallet, setSavingWallet] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [savingIncome, setSavingIncome] = useState(false);
  const [savingBudget, setSavingBudget] = useState(false);
  const [deletingWallet, setDeletingWallet] = useState(false);
  const [deletingBudget, setDeletingBudget] = useState(false);
  const [confirmDeleteWalletOpen, setConfirmDeleteWalletOpen] = useState(false);
  const [confirmDeleteBudgetOpen, setConfirmDeleteBudgetOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [sendingInvite, setSendingInvite] = useState(false);
  const [removingMember, setRemovingMember] = useState(false);

  async function handleEditWallet(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedWallet || !editBank) return;

    setSavingEdit(true);
    try {
      await updateWallet({
        id: selectedWallet._id as Id<"wallets">,
        name: editBank.name,
        label: editLabel || undefined,
        logo: editBank.logo,
      });
      setEditWalletDialogOpen(false);
      toast.success("Wallet diperbarui");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal memperbarui wallet");
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleCreateWallet(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedBank) {
      toast.error("Pilih bank dulu");
      return;
    }

    setSavingWallet(true);
    try {
      await createWallet({
        name: selectedBank.name,
        label: walletLabel || undefined,
        logo: selectedBank.logo,
        initialBalance: parseAmount(walletBalanceInput),
      });
      setSelectedBank(null);
      setWalletLabel("");
      setWalletBalanceInput("");
      setWalletDialogOpen(false);
      toast.success("Wallet ditambahkan");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menambah wallet");
    } finally {
      setSavingWallet(false);
    }
  }

  async function handleCreateIncome(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedWallet) {
      toast.error("Pilih wallet dulu");
      return;
    }

    setSavingIncome(true);
    try {
      await createIncome({
        walletId: selectedWallet._id as Id<"wallets">,
        amount: parseAmount(incomeAmountInput),
        description: incomeDescription.trim(),
        date: incomeDate.getTime(),
      });
      setIncomeDescription("");
      setIncomeAmountInput("");
      setIncomeDate(new Date());
      toast.success("Pemasukan ditambahkan");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menambah pemasukan");
    } finally {
      setSavingIncome(false);
    }
  }

  async function handleSaveBudget(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedWallet) {
      toast.error("Pilih wallet untuk budget");
      return;
    }

    const budgetInputForSelectedWallet =
      budgetAmountInputWalletId === selectedWallet._id
        ? budgetAmountInput
        : selectedWallet.budgetAmount
          ? new Intl.NumberFormat("id-ID").format(selectedWallet.budgetAmount)
          : "";

    setSavingBudget(true);
    try {
      await upsertBudget({
        walletId: selectedWallet._id as Id<"wallets">,
        period,
        amount: parseAmount(budgetInputForSelectedWallet),
      });
      setBudgetAmountInput(new Intl.NumberFormat("id-ID").format(parseAmount(budgetInputForSelectedWallet)));
      setBudgetAmountInputWalletId(selectedWallet._id);
      toast.success("Budget wallet disimpan");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menyimpan budget");
    } finally {
      setSavingBudget(false);
    }
  }

  async function handleDeleteWallet() {
    if (!selectedWallet) return;
    setDeletingWallet(true);
    try {
      await deleteWallet({ id: selectedWallet._id as Id<"wallets"> });
      setConfirmDeleteWalletOpen(false);
      setSelectedWalletId("");
      toast.success("Wallet dihapus");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menghapus wallet");
    } finally {
      setDeletingWallet(false);
    }
  }

  async function handleDeleteBudget() {
    if (!selectedWallet?.budgetId) return;
    setDeletingBudget(true);
    try {
      await deleteBudget({ id: selectedWallet.budgetId as Id<"walletBudgets"> });
      setBudgetAmountInput("");
      setBudgetAmountInputWalletId("");
      toast.success("Budget dihapus");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menghapus budget");
    } finally {
      setDeletingBudget(false);
    }
  }

  async function handleInviteMember(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedWallet) return;
    setSendingInvite(true);
    try {
      await inviteMember({
        walletId: selectedWallet._id as Id<"wallets">,
        email: inviteEmail.trim(),
      });
      setInviteEmail("");
      toast.success("Undangan dikirim");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal mengirim undangan");
    } finally {
      setSendingInvite(false);
    }
  }

  async function handleRemoveMember(memberUserId: string) {
    if (!selectedWallet) return;
    setRemovingMember(true);
    try {
      await removeMember({
        walletId: selectedWallet._id as Id<"wallets">,
        memberUserId: memberUserId as Id<"userProfiles">,
      });
      toast.success("Anggota dikeluarkan");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal mengeluarkan anggota");
    } finally {
      setRemovingMember(false);
    }
  }

  const selectedWallet = overview?.wallets.find((wallet) => wallet._id === effectiveSelectedWalletId) ?? overview?.wallets[0];
  const budgetAmountInputValue =
    budgetAmountInputWalletId === selectedWallet?._id
      ? budgetAmountInput
      : selectedWallet?.budgetAmount
        ? new Intl.NumberFormat("id-ID").format(selectedWallet.budgetAmount)
        : "";

  return (
    <div className="relative mx-auto max-w-lg space-y-5 p-4 pb-6">
      <div
        className="fixed inset-0 -z-10
          bg-[#faf9f6] dark:bg-[#0f172a]
          bg-[radial-gradient(#e2e0d8_1px,transparent_1px)]
          dark:bg-[radial-gradient(#1e293b_1px,transparent_1px)]
          [background-size:32px_32px] opacity-60 dark:opacity-40"
        aria-hidden="true"
      />

      <div className="flex items-start justify-between gap-3 pt-4">
        <div className="flex items-center gap-2">
          <span className="inline-block -rotate-1 bg-primary text-primary-foreground px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest rounded-md">
            Wallet
          </span>
          <span className="text-sm text-muted-foreground">Saldo, pemasukan, dan budget bulanan</span>
        </div>

        <Dialog open={walletDialogOpen} onOpenChange={setWalletDialogOpen}>
          <DialogTrigger asChild>
            <button
              type="button"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/25 transition-colors hover:bg-primary/90"
              aria-label="Tambah wallet"
            >
              <Plus className="h-5 w-5" />
            </button>
          </DialogTrigger>
          <DialogContent className="max-w-md border-border bg-card text-card-foreground overflow-hidden sm:rounded-2xl">
            <DialogHeader>
              <DialogTitle>Tambah Wallet</DialogTitle>
              <DialogDescription>
                Tambahkan sumber dana baru seperti bank, cash, atau e-wallet.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreateWallet} className="space-y-3">
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Pilih Wallet</p>
                <div className="grid grid-cols-3 gap-2">
                  {WALLET_OPTIONS.map((bank) => (
                    <button
                      key={bank.logo}
                      type="button"
                      onClick={() => setSelectedBank(bank)}
                      className={cn(
                        "flex flex-col items-center gap-1 rounded-xl border px-2 py-3 text-center transition-all duration-150",
                        selectedBank?.logo === bank.logo
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-background text-muted-foreground hover:border-primary/30"
                      )}
                    >
                      <Image
                        src={`/bank-logo/${bank.logo}`}
                        alt={bank.name}
                        width={24}
                        height={24}
                        className="h-6 w-6 object-contain"
                      />
                      <span className="text-[10px] font-medium">{bank.name}</span>
                    </button>
                  ))}
                </div>
              </div>
              <input
                value={walletLabel}
                onChange={(e) => setWalletLabel(e.target.value)}
                placeholder="Label (opsional) — Contoh: A, Personal, Bisnis"
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
              <input
                value={walletBalanceInput}
                onChange={(e) => setWalletBalanceInput(formatAmountInput(e.target.value))}
                placeholder="Saldo awal (opsional)"
                inputMode="numeric"
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
              <button
                type="submit"
                disabled={savingWallet || !selectedBank}
                className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground disabled:opacity-50"
              >
                {savingWallet ? "Menyimpan..." : "Simpan Wallet"}
              </button>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={editWalletDialogOpen} onOpenChange={setEditWalletDialogOpen}>
          <DialogContent className="max-w-md border-border bg-card text-card-foreground overflow-hidden sm:rounded-2xl">
            <DialogHeader>
              <DialogTitle>Edit Wallet</DialogTitle>
              <DialogDescription>
                Ganti bank atau sumber dana wallet ini.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleEditWallet} className="space-y-3">
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Pilih Wallet</p>
                <div className="grid grid-cols-3 gap-2">
                  {WALLET_OPTIONS.map((bank) => (
                    <button
                      key={bank.logo}
                      type="button"
                      onClick={() => setEditBank(bank)}
                      className={cn(
                        "flex flex-col items-center gap-1 rounded-xl border px-2 py-3 text-center transition-all duration-150",
                        editBank?.logo === bank.logo
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-background text-muted-foreground hover:border-primary/30"
                      )}
                    >
                      <Image
                        src={`/bank-logo/${bank.logo}`}
                        alt={bank.name}
                        width={24}
                        height={24}
                        className="h-6 w-6 object-contain"
                      />
                      <span className="text-[10px] font-medium">{bank.name}</span>
                    </button>
                  ))}
                </div>
              </div>
              <input
                value={editLabel}
                onChange={(e) => setEditLabel(e.target.value)}
                placeholder="Label (opsional) — Contoh: A, Personal, Bisnis"
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
              <button
                type="submit"
                disabled={savingEdit || !editBank}
                className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground disabled:opacity-50"
              >
                {savingEdit ? "Menyimpan..." : "Simpan Perubahan"}
              </button>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={confirmDeleteWalletOpen} onOpenChange={setConfirmDeleteWalletOpen}>
          <DialogContent className="max-w-sm border-border bg-card text-card-foreground sm:rounded-2xl">
            <DialogHeader>
              <DialogTitle>Hapus Wallet</DialogTitle>
              <DialogDescription>
                Yakin ingin menghapus wallet <span className="font-medium text-foreground">{selectedWallet?.label || selectedWallet?.name}</span>? Wallet yang dihapus tidak dapat dikembalikan.
              </DialogDescription>
            </DialogHeader>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteWalletOpen(false)}
                className="flex-1 rounded-xl border border-border bg-background px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-accent"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeleteWallet}
                disabled={deletingWallet}
                className="flex-1 rounded-xl bg-destructive px-4 py-3 text-sm font-medium text-destructive-foreground transition-colors hover:bg-destructive/90 disabled:opacity-50"
              >
                {deletingWallet ? "Menghapus..." : "Hapus"}
              </button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={confirmDeleteBudgetOpen} onOpenChange={setConfirmDeleteBudgetOpen}>
          <DialogContent className="max-w-sm border-border bg-card text-card-foreground sm:rounded-2xl">
            <DialogHeader>
              <DialogTitle>Hapus Budget</DialogTitle>
              <DialogDescription>
                Yakin ingin menghapus budget <span className="font-medium text-foreground">{formatIDR(selectedWallet?.budgetAmount ?? 0)}</span> untuk wallet ini?
              </DialogDescription>
            </DialogHeader>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteBudgetOpen(false)}
                className="flex-1 rounded-xl border border-border bg-background px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-accent"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeleteBudget}
                disabled={deletingBudget}
                className="flex-1 rounded-xl bg-destructive px-4 py-3 text-sm font-medium text-destructive-foreground transition-colors hover:bg-destructive/90 disabled:opacity-50"
              >
                {deletingBudget ? "Menghapus..." : "Hapus"}
              </button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
          <DialogContent className="max-w-md border-border bg-card text-card-foreground overflow-hidden sm:rounded-2xl">
            <DialogHeader>
              <DialogTitle>Bagikan Wallet</DialogTitle>
              <DialogDescription>
                Undang anggota keluarga untuk mengakses wallet <span className="font-medium text-foreground">{selectedWallet?.label || selectedWallet?.name}</span>.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleInviteMember} className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="Email anggota"
                  className="flex-1 rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground"
                  required
                />
                <button
                  type="submit"
                  disabled={sendingInvite || !inviteEmail.trim()}
                  className="rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
                >
                  <UserPlus className="h-4 w-4" />
                </button>
              </div>
            </form>

            {members && members.length > 1 && (
              <div className="space-y-2">
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Anggota Saat Ini</p>
                <div className="space-y-1.5">
                  {members.map((member) => (
                    <div key={member.userId} className="flex items-center justify-between rounded-xl border border-border bg-background/60 px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
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
                        {selectedWallet?.createdBy === currentProfile?._id && member.role !== "owner" && (
                          <button
                            type="button"
                            onClick={() => handleRemoveMember(member.userId)}
                            disabled={removingMember}
                            className="rounded p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                            aria-label="Keluarkan"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {overview && overview.wallets.length > 0 && (
        <WalletFolderTabs
          wallets={overview.wallets}
          selectedWalletId={selectedWallet?._id ?? ""}
          onSelect={setSelectedWalletId}
        />
      )}

      <div className={cn(cardShadow, overview?.wallets.length ? "-mt-5 pt-6 rounded-t-none" : "") }>
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Ringkasan</p>
        {overview === undefined ? (
          <div className="mt-3 space-y-2">
            <Skeleton className="h-8 bg-muted" />
            <Skeleton className="h-20 bg-muted" />
          </div>
        ) : (
          <div
            key={selectedWalletId}
            className="animate-wallet-slide-up mt-3 space-y-3"
          >
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-muted/60 px-2 py-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Saldo</p>
                <p className="mt-1 text-sm font-semibold text-foreground">{formatIDR(overview.totalBalance)}</p>
              </div>
              <div className="rounded-xl bg-muted/60 px-2 py-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Income</p>
                <p className="mt-1 text-sm font-semibold text-foreground">{formatIDR(overview.totalMonthIncome)}</p>
              </div>
              <div className="rounded-xl bg-muted/60 px-2 py-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Expense</p>
                <p className="mt-1 text-sm font-semibold text-foreground">{formatIDR(overview.totalMonthExpense)}</p>
              </div>
            </div>

            <div className="space-y-3">
              {selectedWallet && (
                <div className="rounded-xl border border-border bg-background/60 px-3 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground">{selectedWallet.label || selectedWallet.name}</p>
                        <button
                          type="button"
                          onClick={() => {
                            const bank = WALLET_OPTIONS.find((b) => b.logo === selectedWallet.logo) ?? null;
                            setEditBank(bank);
                            setEditLabel(selectedWallet.label ?? "");
                            setEditWalletDialogOpen(true);
                          }}
                          className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                          aria-label="Edit wallet"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                        {selectedWallet.createdBy === currentProfile?._id && (
                          <button
                            type="button"
                            onClick={() => setShareDialogOpen(true)}
                            className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                            aria-label="Bagikan wallet"
                          >
                            <Users className="h-3 w-3" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteWalletOpen(true)}
                          className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                          aria-label="Hapus wallet"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Income {formatIDR(selectedWallet.monthIncome)} • Expense {formatIDR(selectedWallet.monthExpense)}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-foreground">{formatIDR(selectedWallet.balance)}</p>
                  </div>
                  {selectedWallet.budgetAmount > 0 && (
                    <div className="mt-3">
                      <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                        <span>Budget {formatIDR(selectedWallet.budgetAmount)}</span>
                        <div className="flex items-center gap-2">
                          <span>Sisa {formatIDR(selectedWallet.budgetRemaining)}</span>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteBudgetOpen(true)}
                            disabled={deletingBudget}
                            className="rounded p-0.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                            aria-label="Hapus budget"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${selectedWallet.budgetUsedPct}%` }} />
                      </div>
                    </div>
                  )}

                  {members && members.length > 1 && (
                    <div className="mt-3 border-t border-dashed border-border pt-3">
                      <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Anggota</p>
                      <div className="flex flex-wrap items-center gap-2">
                        {members.map((member) => (
                          <div
                            key={member.userId}
                            className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/50 px-2 py-1"
                          >
                            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[8px] font-bold text-primary">
                              {member.name.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-xs text-foreground">{member.name}</span>
                            {member.role === "owner" && (
                              <span className="rounded bg-primary/10 px-1 text-[8px] font-medium text-primary">Pemilik</span>
                            )}
                            {selectedWallet.createdBy === currentProfile?._id && member.role !== "owner" && (
                              <button
                                type="button"
                                onClick={() => handleRemoveMember(member.userId)}
                                disabled={removingMember}
                                className="ml-0.5 rounded p-0.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                                aria-label="Keluarkan anggota"
                              >
                                <X className="h-2.5 w-2.5" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              {overview.wallets.length === 0 && (
                <p className="text-sm text-muted-foreground">Belum ada wallet. Tekan tombol + di kanan atas untuk menambah wallet pertama.</p>
              )}
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleCreateIncome} className={cn(cardShadow, "space-y-3")}>
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Tambah Income</p>
          <span className="rounded-full border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground">
            {selectedWallet?.label || selectedWallet?.name || "Pilih wallet"}
          </span>
        </div>
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_10.5rem]">
          <input
            value={incomeDescription}
            onChange={(e) => setIncomeDescription(e.target.value)}
            placeholder="Deskripsi income"
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground"
            required
          />
          <input
            value={incomeAmountInput}
            onChange={(e) => setIncomeAmountInput(formatAmountInput(e.target.value))}
            placeholder="Jumlah"
            inputMode="numeric"
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground"
            required
          />
        </div>
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <Popover open={incomeDatePickerOpen} onOpenChange={setIncomeDatePickerOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-xl border border-border bg-background px-3 py-2.5 text-left text-sm font-medium text-foreground transition-colors hover:border-primary/30"
              >
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                {format(incomeDate, "EEEE, d MMMM yyyy", { locale: idLocale })}
                <ChevronDown className="ml-auto h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto border-border bg-popover p-0" align="start">
              <Calendar
                mode="single"
                selected={incomeDate}
                onSelect={(date) => {
                  if (!date) return;
                  setIncomeDate(date);
                  setIncomeDatePickerOpen(false);
                }}
              />
            </PopoverContent>
          </Popover>
          <button
            type="submit"
            disabled={savingIncome}
            className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50 sm:w-auto"
          >
            {savingIncome ? "Menyimpan..." : "Simpan"}
          </button>
        </div>
      </form>

      <form onSubmit={handleSaveBudget} className={cn(cardShadow, "space-y-3")}>
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Budget Wallet Bulan Ini</p>
          <span className="rounded-full border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground">
            {selectedWallet?.label || selectedWallet?.name || "Pilih wallet"}
          </span>
        </div>
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <input
            value={budgetAmountInputValue}
            onChange={(e) => {
              setBudgetAmountInputWalletId(selectedWallet?._id ?? "");
              setBudgetAmountInput(formatAmountInput(e.target.value));
            }}
            placeholder={`Budget ${period}`}
            inputMode="numeric"
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground"
            required
          />
          <button
            type="submit"
            disabled={savingBudget}
            className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50 sm:w-auto"
          >
            {savingBudget ? "Menyimpan..." : "Simpan"}
          </button>
        </div>
      </form>

      <div className={cardShadow}>
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Income Terbaru</p>
        {incomes === undefined ? (
          <div className="mt-3 space-y-2">
            {[...Array(3)].map((_, index) => <Skeleton key={index} className="h-14 bg-muted" />)}
          </div>
        ) : incomes.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">Belum ada income.</p>
        ) : (
          <div className="mt-3 space-y-3">
            {incomes.map((income) => (
              <div key={income._id} className="rounded-xl border border-border bg-background/60 px-3 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">{income.description}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {format(new Date(income.date), "d MMM yyyy")}
                      {income.receivedByName && currentProfile?._id !== income.receivedBy ? (
                        <span className="ml-1 font-medium text-primary"> • {income.receivedByName}</span>
                      ) : null}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-foreground">{formatIDR(income.amount)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
