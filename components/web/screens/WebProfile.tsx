"use client";

import { type ElementType, type FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuthActions } from "@convex-dev/auth/react";
import { useAction, useMutation, useQuery } from "convex/react";
import {
  KeyRound, LogOut, Mail, PencilLine, Shield, User2, Users,
  Plus, Wallet, Check, SlidersHorizontal, FileUp, Database, AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { classifyPreviewDirection, IMPORT_CSV_TEMPLATE_PATH, parseImportedCsv, type ImportedCsvRow } from "@/lib/import-csv";

const cardCls =
  "rounded-2xl border border-border bg-card shadow-[2px_3px_0px_0px_rgba(0,0,0,0.06)] dark:shadow-[2px_3px_0px_0px_rgba(255,255,255,0.06)]";

function DetailRow({ icon: Icon, label, value }: { icon: ElementType; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-muted/50 px-4 py-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
        <p className="mt-0.5 truncate text-sm font-medium text-foreground">{value}</p>
      </div>
    </div>
  );
}

export function WebProfile() {
  const router = useRouter();
  const { signOut } = useAuthActions();
  const profile = useQuery(api.users.getCurrentUserProfile);
  const updateProfile = useMutation(api.users.updateCurrentUserProfile);
  const changePassword = useAction(api.users.changeCurrentUserPassword);
  const familyMembers = useQuery(api.walletSharing.listMyFamilyMembers);
  const ownedWallets = useQuery(api.wallets.listOwnedWallets);
  const inviteMember = useMutation(api.walletSharing.inviteMember);
  const grantAccess = useMutation(api.walletSharing.grantAccess);
  const removeMember = useMutation(api.walletSharing.removeMember);
  const importTransactions = useMutation(api.imports.importTransactionsFromCsv);

  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [familyInviteOpen, setFamilyInviteOpen] = useState(false);
  const [familyInviteEmail, setFamilyInviteEmail] = useState("");
  const [selectedWalletIds, setSelectedWalletIds] = useState<Set<string>>(new Set());
  const [sendingFamilyInvite, setSendingFamilyInvite] = useState(false);

  const [manageAccessOpen, setManageAccessOpen] = useState(false);
  const [managingMember, setManagingMember] = useState<{ userId: string; name: string } | null>(null);
  const [managingMemberWallets, setManagingMemberWallets] = useState<Set<string>>(new Set());
  const [savingAccess, setSavingAccess] = useState(false);

  const [walletMode, setWalletMode] = useState<"existing" | "new">("existing");
  const [selectedImportWalletId, setSelectedImportWalletId] = useState<string>("");
  const [newImportWalletName, setNewImportWalletName] = useState("");
  const [parsedImportRows, setParsedImportRows] = useState<ImportedCsvRow[]>([]);
  const [importFileName, setImportFileName] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [importErrors, setImportErrors] = useState<Array<{ rowNumber: number; message: string }>>([]);
  const [importSummary, setImportSummary] = useState<{ imported: number; incomeCount: number; expenseCount: number; skippedCount: number } | null>(null);

  const importPreview = useMemo(() => {
    let income = 0, expense = 0, ambiguous = 0;
    for (const row of parsedImportRows) {
      const d = classifyPreviewDirection(row);
      if (d === "income") income++; else if (d === "expense") expense++; else ambiguous++;
    }
    return { total: parsedImportRows.length, income, expense, ambiguous };
  }, [parsedImportRows]);

  async function handleSignOut() {
    setIsSigningOut(true);
    try { await signOut(); router.replace("/login"); } finally { setIsSigningOut(false); }
  }

  async function handleProfileSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setIsSavingProfile(true);
    try { await updateProfile({ name: name.trim(), bio: bio.trim() }); toast.success("Profil diperbarui"); setIsEditOpen(false); }
    catch (err) { toast.error(err instanceof Error ? err.message : "Gagal"); }
    finally { setIsSavingProfile(false); }
  }

  async function handlePasswordSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (newPassword !== confirmPassword) { toast.error("Konfirmasi password baru belum sama."); return; }
    setIsSavingPassword(true);
    try { await changePassword({ currentPassword, newPassword }); toast.success("Password berhasil diganti"); setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); setIsPasswordOpen(false); }
    catch (err) { toast.error(err instanceof Error ? err.message : "Gagal"); }
    finally { setIsSavingPassword(false); }
  }

  async function handleFamilyInvite(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!familyInviteEmail.trim() || selectedWalletIds.size === 0) { toast.error("Pilih minimal satu wallet"); return; }
    setSendingFamilyInvite(true);
    try {
      await Promise.all(Array.from(selectedWalletIds).map((id) => inviteMember({ walletId: id as Id<"wallets">, email: familyInviteEmail.trim() })));
      setFamilyInviteEmail(""); setSelectedWalletIds(new Set()); setFamilyInviteOpen(false);
      toast.success("Undangan dikirim");
    } catch (err) { toast.error(err instanceof Error ? err.message : "Gagal"); }
    finally { setSendingFamilyInvite(false); }
  }

  async function handleSaveAccess() {
    if (!managingMember || !ownedWallets) return;
    setSavingAccess(true);
    try {
      const currentAccess = new Set(familyMembers?.find((m) => m.userId === managingMember.userId)?.wallets.map((w) => w._id) ?? []);
      const toGrant = Array.from(managingMemberWallets).filter((id) => !currentAccess.has(id));
      const toRevoke = Array.from(currentAccess).filter((id) => !managingMemberWallets.has(id));
      await Promise.all([
        ...toGrant.map((id) => grantAccess({ walletId: id as Id<"wallets">, memberUserId: managingMember.userId as Id<"userProfiles"> })),
        ...toRevoke.map((id) => removeMember({ walletId: id as Id<"wallets">, memberUserId: managingMember.userId as Id<"userProfiles"> })),
      ]);
      toast.success("Akses diperbarui"); setManageAccessOpen(false); setManagingMember(null);
    } catch (err) { toast.error(err instanceof Error ? err.message : "Gagal"); }
    finally { setSavingAccess(false); }
  }

  async function handleImportFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    try { const text = await file.text(); const rows = parseImportedCsv(text); setParsedImportRows(rows); setImportFileName(file.name); setImportErrors([]); setImportSummary(null); toast.success(`${rows.length} baris siap diimpor`); }
    catch { toast.error("Gagal membaca file CSV"); }
  }

  async function handleImportSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (parsedImportRows.length === 0) { toast.error("Pilih file CSV terlebih dulu"); return; }
    if (walletMode === "existing" && !selectedImportWalletId) { toast.error("Pilih wallet tujuan"); return; }
    if (walletMode === "new" && !newImportWalletName.trim()) { toast.error("Isi nama wallet baru"); return; }
    setIsImporting(true);
    try {
      const result = await importTransactions({ rows: parsedImportRows, walletId: walletMode === "existing" ? (selectedImportWalletId as Id<"wallets">) : undefined, newWalletName: walletMode === "new" ? newImportWalletName.trim() : undefined });
      setImportSummary({ imported: result.imported, incomeCount: result.incomeCount, expenseCount: result.expenseCount, skippedCount: result.skippedCount });
      setImportErrors(result.errors); toast.success(`Import selesai: ${result.imported} transaksi masuk`);
    } catch (err) { toast.error(err instanceof Error ? err.message : "Gagal mengimpor CSV"); }
    finally { setIsImporting(false); }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="inline-block -rotate-1 rounded-md bg-primary px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-primary-foreground">Profil</span>
        <h1 className="text-2xl font-bold text-card-foreground">Pengaturan Akun</h1>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        {/* Left column: profile + security */}
        <div className="space-y-5">
          {profile === undefined ? (
            <div className={cn(cardCls, "space-y-4 p-5")}>
              <div className="flex items-center gap-4">
                <Skeleton className="h-16 w-16 rounded-2xl bg-muted" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-28 bg-muted" />
                  <Skeleton className="h-4 w-40 bg-muted" />
                </div>
              </div>
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 rounded-2xl bg-muted" />)}
            </div>
          ) : profile === null ? (
            <div className={cn(cardCls, "p-5 text-sm text-muted-foreground")}>Profil belum tersedia.</div>
          ) : (
            <section className={cn(cardCls, "overflow-hidden")}>
              {/* Profile header */}
              <div className="border-b border-border bg-gradient-to-b from-primary/10 to-transparent p-5">
                <div className="flex items-start gap-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-2xl font-semibold text-primary">
                    {profile.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xl font-semibold text-card-foreground">{profile.name}</p>
                    <p className="mt-0.5 truncate text-sm text-muted-foreground">{profile.bio || profile.email}</p>
                    <div className="mt-3 flex items-center gap-2">
                      <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.16em]", profile.role === "owner" ? "border-amber-400/20 bg-amber-400/10 text-amber-600 dark:text-amber-300" : "border-primary/20 bg-primary/10 text-primary")}>
                        {profile.role}
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/15 bg-emerald-400/10 px-2.5 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-300">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        Aktif
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setName(profile.name); setBio(profile.bio ?? ""); setIsEditOpen(true); }}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                    aria-label="Edit profil"
                  >
                    <PencilLine className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-3 p-5">
                <DetailRow icon={User2} label="Nama" value={profile.name} />
                <DetailRow icon={Mail} label="Email" value={profile.email} />
                <DetailRow icon={PencilLine} label="Bio" value={profile.bio?.trim() ? profile.bio : "Belum ada bio"} />
                <DetailRow icon={Shield} label="Peran" value={profile.role === "owner" ? "Owner" : "Admin"} />

                <button
                  type="button"
                  onClick={() => setIsPasswordOpen(true)}
                  className="flex w-full items-center justify-between rounded-2xl border border-border bg-muted/50 px-4 py-3 text-left transition-colors hover:border-primary/30 hover:bg-accent/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
                      <KeyRound className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Keamanan</p>
                      <p className="mt-0.5 text-sm font-medium text-card-foreground">Ganti password</p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">Update</span>
                </button>

                <Button
                  type="button"
                  variant="destructive"
                  className="mt-2 h-12 w-full rounded-2xl bg-destructive/10 text-destructive hover:bg-destructive/15"
                  disabled={isSigningOut}
                  onClick={handleSignOut}
                >
                  <LogOut className="h-4 w-4" />
                  {isSigningOut ? "Keluar..." : "Logout"}
                </Button>
              </div>
            </section>
          )}

          {/* Family members */}
          <section className={cn(cardCls, "overflow-hidden")}>
            <div className="flex items-center justify-between gap-4 border-b border-border bg-gradient-to-b from-primary/10 to-transparent p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
                  <Users className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-card-foreground">Keluarga</p>
                  <p className="text-xs text-muted-foreground">Bagikan wallet dengan anggota keluarga</p>
                </div>
              </div>
              {ownedWallets && ownedWallets.length > 0 && (
                <button
                  type="button"
                  onClick={() => setFamilyInviteOpen(true)}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                  aria-label="Undang anggota keluarga"
                >
                  <Plus className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="p-5">
              {familyMembers === undefined ? (
                <div className="space-y-3">
                  {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-14 rounded-xl bg-muted" />)}
                </div>
              ) : familyMembers.length === 0 ? (
                <div className="py-6 text-center">
                  <p className="text-sm text-muted-foreground">Belum ada anggota keluarga.</p>
                  <p className="mt-1 text-xs text-muted-foreground">Tekan tombol + untuk mengundang.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {familyMembers.map((member) => {
                    const canManage = ownedWallets && member.wallets.some((w) => ownedWallets.some((ow) => ow._id === w._id));
                    return (
                      <div key={member.userId} className="flex items-start gap-3 rounded-xl border border-border bg-muted/50 px-4 py-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-medium text-foreground">{member.name}</p>
                            {canManage && (
                              <button
                                type="button"
                                onClick={() => { setManagingMember({ userId: member.userId, name: member.name }); setManagingMemberWallets(new Set(member.wallets.map((w) => w._id))); setManageAccessOpen(true); }}
                                className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                                aria-label="Kelola akses"
                              >
                                <SlidersHorizontal className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">{member.email}</p>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {member.wallets.map((wallet) => (
                              <span key={wallet._id} className="inline-flex items-center gap-1 rounded-full border border-primary/15 bg-primary/5 px-2 py-0.5 text-[10px] font-medium text-primary">
                                <Wallet className="h-2.5 w-2.5" />
                                {wallet.label || wallet.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Right column: CSV import */}
        <div>
          <section className={cn(cardCls, "overflow-hidden")}>
            <div className="flex items-center gap-3 border-b border-border bg-gradient-to-b from-primary/10 to-transparent p-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
                <FileUp className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-card-foreground">Import CSV</p>
                <p className="text-xs text-muted-foreground">Import transaksi ke akun yang sedang login</p>
              </div>
            </div>

            <form onSubmit={handleImportSubmit} className="space-y-4 p-5">
              <div className="space-y-2">
                <label htmlFor="import-csv" className="text-sm text-foreground">File CSV</label>
                <Input id="import-csv" type="file" accept=".csv,text/csv" onChange={handleImportFileChange} className="border-border bg-background text-foreground" />
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <a href={IMPORT_CSV_TEMPLATE_PATH} download className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 font-medium text-primary transition-colors hover:bg-primary/10">
                    Download Template CSV
                  </a>
                  <span>Format tanggal `YYYY-MM-DD`.</span>
                  <span>Isi `Debit` untuk pemasukan.</span>
                  <span>Isi `Credit` untuk pengeluaran.</span>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {(["existing", "new"] as const).map((mode) => (
                  <button key={mode} type="button" onClick={() => setWalletMode(mode)} className={cn("rounded-2xl border px-4 py-3 text-left transition-colors", walletMode === mode ? "border-primary bg-primary/5" : "border-border bg-background")}>
                    <p className="text-sm font-medium text-foreground">{mode === "existing" ? "Pakai wallet yang ada" : "Buat wallet baru"}</p>
                    <p className="text-xs text-muted-foreground">{mode === "existing" ? "Cocok untuk wallet yang sudah dibuat" : "Bikin wallet otomatis saat import"}</p>
                  </button>
                ))}
              </div>

              {walletMode === "existing" ? (
                <div className="space-y-2">
                  <label className="text-sm text-foreground">Wallet tujuan</label>
                  <Select value={selectedImportWalletId} onValueChange={setSelectedImportWalletId}>
                    <SelectTrigger className="border-border bg-background text-foreground"><SelectValue placeholder="Pilih wallet" /></SelectTrigger>
                    <SelectContent>{(ownedWallets ?? []).map((w) => <SelectItem key={w._id} value={w._id}>{w.label || w.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="space-y-2">
                  <label htmlFor="new-wallet-name" className="text-sm text-foreground">Nama wallet baru</label>
                  <Input id="new-wallet-name" value={newImportWalletName} onChange={(e) => setNewImportWalletName(e.target.value)} placeholder="Aquaponic Dev Investment" className="border-border bg-background text-foreground" />
                </div>
              )}

              <div className="rounded-2xl border border-border bg-muted/40 p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Database className="h-4 w-4" />
                  Ringkasan file
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  {[
                    { label: "Nama file", value: importFileName || "Belum dipilih" },
                    { label: "Total baris", value: String(importPreview.total) },
                    { label: "Income terdeteksi", value: String(importPreview.income) },
                    { label: "Expense terdeteksi", value: String(importPreview.expense) },
                  ].map(({ label, value }) => (
                    <div key={label} className="rounded-xl border border-border bg-background px-3 py-2">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
                      <p className="mt-1 truncate text-sm text-foreground">{value}</p>
                    </div>
                  ))}
                </div>
                {importPreview.ambiguous > 0 && (
                  <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <p>{importPreview.ambiguous} baris ambigu — akan dilewati.</p>
                  </div>
                )}
              </div>

              {importSummary && (
                <div className="rounded-2xl border border-border bg-muted/40 p-4 text-sm text-foreground">
                  <p className="font-medium">Hasil import</p>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <p>Berhasil: {importSummary.imported}</p>
                    <p>Income: {importSummary.incomeCount}</p>
                    <p>Expense: {importSummary.expenseCount}</p>
                    <p>Dilewati: {importSummary.skippedCount}</p>
                  </div>
                </div>
              )}

              {importErrors.length > 0 && (
                <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4">
                  <p className="text-sm font-medium text-foreground">Contoh error baris</p>
                  <div className="mt-2 space-y-2 text-xs text-muted-foreground">
                    {importErrors.slice(0, 8).map((err) => (
                      <p key={`${err.rowNumber}-${err.message}`}>Baris {err.rowNumber}: {err.message}</p>
                    ))}
                  </div>
                </div>
              )}

              <Button type="submit" className="h-11 w-full rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90" disabled={isImporting || parsedImportRows.length === 0}>
                {isImporting ? "Mengimpor..." : "Import CSV"}
              </Button>
            </form>
          </section>
        </div>
      </div>

      {/* Edit profile dialog */}
      <Dialog open={isEditOpen} onOpenChange={(open) => { setIsEditOpen(open); if (open && profile) { setName(profile.name); setBio(profile.bio ?? ""); } }}>
        <DialogContent className="max-w-md border-border bg-card text-card-foreground sm:rounded-2xl">
          <DialogHeader>
            <DialogTitle>Edit profil</DialogTitle>
            <DialogDescription className="text-muted-foreground">Ubah nama dan bio yang tampil di akun.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="web-name" className="text-sm text-foreground">Nama</label>
              <Input id="web-name" value={name} onChange={(e) => setName(e.target.value)} className="border-border bg-background text-foreground" maxLength={60} required />
            </div>
            <div className="space-y-2">
              <label htmlFor="web-bio" className="text-sm text-foreground">Bio</label>
              <textarea id="web-bio" value={bio} onChange={(e) => setBio(e.target.value)} className="min-h-24 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary" maxLength={160} placeholder="Tambahkan bio singkat..." />
            </div>
            <Button type="submit" className="h-11 w-full rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90" disabled={isSavingProfile}>
              {isSavingProfile ? "Menyimpan..." : "Simpan perubahan"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Change password dialog */}
      <Dialog open={isPasswordOpen} onOpenChange={(open) => { setIsPasswordOpen(open); if (!open) { setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); } }}>
        <DialogContent className="max-w-md border-border bg-card text-card-foreground sm:rounded-2xl">
          <DialogHeader>
            <DialogTitle>Ganti password</DialogTitle>
            <DialogDescription className="text-muted-foreground">Masukkan password saat ini lalu buat password baru minimal 8 karakter.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            {([["current-pwd", "Password saat ini", currentPassword, setCurrentPassword, "current-password"], ["new-pwd", "Password baru", newPassword, setNewPassword, "new-password"], ["confirm-pwd", "Konfirmasi password baru", confirmPassword, setConfirmPassword, "new-password"]] as const).map(([id, label, val, setter, autocomplete]) => (
              <div key={id} className="space-y-2">
                <label htmlFor={id} className="text-sm text-foreground">{label}</label>
                <Input id={id} type="password" value={val} onChange={(e) => setter(e.target.value)} className="border-border bg-background text-foreground" autoComplete={autocomplete} minLength={8} required />
              </div>
            ))}
            <Button type="submit" className="h-11 w-full rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90" disabled={isSavingPassword}>
              {isSavingPassword ? "Menyimpan..." : "Perbarui password"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Family invite dialog */}
      <Dialog open={familyInviteOpen} onOpenChange={setFamilyInviteOpen}>
        <DialogContent className="max-w-md border-border bg-card text-card-foreground sm:rounded-2xl">
          <DialogHeader>
            <DialogTitle>Undang Anggota Keluarga</DialogTitle>
            <DialogDescription className="text-muted-foreground">Masukkan email dan pilih wallet yang ingin dibagikan.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleFamilyInvite} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="family-email" className="text-sm text-foreground">Email</label>
              <Input id="family-email" type="email" value={familyInviteEmail} onChange={(e) => setFamilyInviteEmail(e.target.value)} placeholder="email@contoh.com" className="border-border bg-background text-foreground" required />
            </div>
            <div className="space-y-2">
              <p className="text-sm text-foreground">Pilih Wallet</p>
              {(ownedWallets ?? []).map((wallet) => {
                const selected = selectedWalletIds.has(wallet._id);
                return (
                  <button key={wallet._id} type="button" onClick={() => { const next = new Set(selectedWalletIds); if (selected) next.delete(wallet._id); else next.add(wallet._id); setSelectedWalletIds(next); }} className={cn("flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all", selected ? "border-primary bg-primary/5 text-foreground" : "border-border bg-background text-muted-foreground hover:border-primary/30")}>
                    {wallet.logo ? <Image src={`/bank-logo/${wallet.logo}`} alt={wallet.name} width={20} height={20} className="h-5 w-5 object-contain" /> : <Wallet className="h-4 w-4" />}
                    <span className="flex-1 text-sm">{wallet.label || wallet.name}</span>
                    {selected && <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground"><Check className="h-3 w-3" /></span>}
                  </button>
                );
              })}
            </div>
            <Button type="submit" className="h-11 w-full rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90" disabled={sendingFamilyInvite || selectedWalletIds.size === 0 || !familyInviteEmail.trim()}>
              {sendingFamilyInvite ? "Mengirim..." : "Kirim Undangan"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Manage access dialog */}
      <Dialog open={manageAccessOpen} onOpenChange={setManageAccessOpen}>
        <DialogContent className="border-border bg-popover text-popover-foreground sm:rounded-2xl">
          <DialogHeader>
            <DialogTitle>Kelola Akses</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Atur wallet yang dapat diakses oleh <span className="font-medium text-foreground">{managingMember?.name}</span>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {(ownedWallets ?? []).map((wallet) => {
              const selected = managingMemberWallets.has(wallet._id);
              return (
                <button key={wallet._id} type="button" onClick={() => { const next = new Set(managingMemberWallets); if (selected) next.delete(wallet._id); else next.add(wallet._id); setManagingMemberWallets(next); }} className={cn("flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all", selected ? "border-primary bg-primary/5 text-foreground" : "border-border bg-background text-muted-foreground hover:border-primary/30")}>
                  {wallet.logo ? <Image src={`/bank-logo/${wallet.logo}`} alt={wallet.name} width={20} height={20} className="h-5 w-5 object-contain" /> : <Wallet className="h-4 w-4" />}
                  <span className="flex-1 text-sm">{wallet.label || wallet.name}</span>
                  {selected && <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground"><Check className="h-3 w-3" /></span>}
                </button>
              );
            })}
            <Button type="button" onClick={handleSaveAccess} className="h-11 w-full rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90" disabled={savingAccess}>
              {savingAccess ? "Menyimpan..." : "Simpan Perubahan"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
