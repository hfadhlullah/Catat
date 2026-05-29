"use client";

import { FormEvent, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { CalendarIcon, ChevronDown, Plus } from "lucide-react";
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

const BANK_OPTIONS = [
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
];

function WalletFolderTabs({
  wallets,
  selectedWalletId,
  onSelect,
}: {
  wallets: Array<{
    _id: string;
    name: string;
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
                <img
                  src={`/bank-logo/${wallet.logo}`}
                  alt={wallet.name}
                  className={cn("h-5 w-auto object-contain", active ? "brightness-0 dark:invert" : "opacity-60")}
                />
              ) : (
                <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Wallet</p>
              )}
              <p className="mt-1 text-sm font-semibold">{wallet.name}</p>
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
  const incomes = useQuery(api.incomes.listRecentIncome);
  const createWallet = useMutation(api.wallets.createWallet);
  const createIncome = useMutation(api.incomes.createIncome);
  const upsertBudget = useMutation(api.walletBudgets.upsertWalletBudget);

  const [selectedBank, setSelectedBank] = useState<{ name: string; logo: string } | null>(null);
  const [walletBalanceInput, setWalletBalanceInput] = useState("");
  const [selectedWalletId, setSelectedWalletId] = useState<string>("");
  const [incomeDescription, setIncomeDescription] = useState("");
  const [incomeAmountInput, setIncomeAmountInput] = useState("");
  const [incomeDate, setIncomeDate] = useState(new Date());
  const [incomeDatePickerOpen, setIncomeDatePickerOpen] = useState(false);
  const [budgetAmountInput, setBudgetAmountInput] = useState("");
  const [budgetAmountInputWalletId, setBudgetAmountInputWalletId] = useState("");
  const [walletDialogOpen, setWalletDialogOpen] = useState(false);
  const [savingWallet, setSavingWallet] = useState(false);
  const [savingIncome, setSavingIncome] = useState(false);
  const [savingBudget, setSavingBudget] = useState(false);

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
        logo: selectedBank.logo,
        initialBalance: parseAmount(walletBalanceInput),
      });
      setSelectedBank(null);
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

  const selectedWallet = overview?.wallets.find((wallet) => wallet._id === selectedWalletId) ?? overview?.wallets[0];
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
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Pilih Bank</p>
                <div className="grid grid-cols-3 gap-2">
                  {BANK_OPTIONS.map((bank) => (
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
                      <img
                        src={`/bank-logo/${bank.logo}`}
                        alt={bank.name}
                        className="h-6 w-6 object-contain"
                      />
                      <span className="text-[10px] font-medium">{bank.name}</span>
                    </button>
                  ))}
                </div>
              </div>
              <input
                value={walletBalanceInput}
                onChange={(e) => setWalletBalanceInput(formatAmountInput(e.target.value))}
                placeholder="Saldo awal"
                inputMode="numeric"
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground"
                required
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
          <div className="mt-3 space-y-3">
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
                    <div>
                      <p className="text-sm font-medium text-foreground">{selectedWallet.name}</p>
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
                        <span>Sisa {formatIDR(selectedWallet.budgetRemaining)}</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${selectedWallet.budgetUsedPct}%` }} />
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
            {selectedWallet?.name ?? "Pilih wallet"}
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
            {selectedWallet?.name ?? "Pilih wallet"}
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
                      {income.wallet?.name ?? "Wallet"} • {format(new Date(income.date), "d MMM yyyy")}
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
