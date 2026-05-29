"use client";

import { type ElementType, type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuthActions } from "@convex-dev/auth/react";
import { useAction, useMutation, useQuery } from "convex/react";
import { KeyRound, LogOut, Mail, PencilLine, Shield, User2, Users, Plus, Wallet, Check, SlidersHorizontal } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { ThemeSwitcher } from "@/components/theme/ThemeSwitcher";
import { toast } from "sonner";

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: ElementType;
  label: string;
  value: string;
}) {
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

export default function ProfilePage() {
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

  async function handleSignOut() {
    setIsSigningOut(true);

    try {
      await signOut();
      router.replace("/login");
    } finally {
      setIsSigningOut(false);
    }
  }

  async function handleProfileSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSavingProfile(true);

    try {
      await updateProfile({
        name: name.trim(),
        bio: bio.trim(),
      });
      toast.success("Profil diperbarui");
      setIsEditOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal memperbarui profil");
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function handlePasswordSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error("Konfirmasi password baru belum sama.");
      return;
    }

    setIsSavingPassword(true);

    try {
      await changePassword({ currentPassword, newPassword });
      toast.success("Password berhasil diganti");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setIsPasswordOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal mengganti password");
    } finally {
      setIsSavingPassword(false);
    }
  }

  function handleEditOpenChange(open: boolean) {
    setIsEditOpen(open);
    if (open && profile) {
      setName(profile.name);
      setBio(profile.bio ?? "");
    }
  }

  function handlePasswordOpenChange(open: boolean) {
    setIsPasswordOpen(open);
    if (!open) {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
  }

  async function handleFamilyInvite(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!familyInviteEmail.trim() || selectedWalletIds.size === 0) {
      toast.error("Pilih minimal satu wallet untuk dibagikan");
      return;
    }

    setSendingFamilyInvite(true);
    try {
      const promises = Array.from(selectedWalletIds).map((walletId) =>
        inviteMember({
          walletId: walletId as Id<"wallets">,
          email: familyInviteEmail.trim(),
        })
      );
      await Promise.all(promises);
      setFamilyInviteEmail("");
      setSelectedWalletIds(new Set());
      setFamilyInviteOpen(false);
      toast.success("Undangan dikirim");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal mengirim undangan");
    } finally {
      setSendingFamilyInvite(false);
    }
  }

  async function handleSaveAccess() {
    if (!managingMember || !ownedWallets) return;
    setSavingAccess(true);
    try {
      const currentAccess = new Set(
        familyMembers
          ?.find((m) => m.userId === managingMember.userId)
          ?.wallets.map((w) => w._id) ?? []
      );

      const toGrant = Array.from(managingMemberWallets).filter((id) => !currentAccess.has(id));
      const toRevoke = Array.from(currentAccess).filter((id) => !managingMemberWallets.has(id));

      await Promise.all([
        ...toGrant.map((walletId) =>
          grantAccess({
            walletId: walletId as Id<"wallets">,
            memberUserId: managingMember.userId as Id<"userProfiles">,
          })
        ),
        ...toRevoke.map((walletId) =>
          removeMember({
            walletId: walletId as Id<"wallets">,
            memberUserId: managingMember.userId as Id<"userProfiles">,
          })
        ),
      ]);

      toast.success("Akses diperbarui");
      setManageAccessOpen(false);
      setManagingMember(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal memperbarui akses");
    } finally {
      setSavingAccess(false);
    }
  }

  return (
    <div className="relative mx-auto max-w-lg space-y-5 p-4">
      {/* Paper texture */}
      <div
        className="fixed inset-0 -z-10
          bg-[#faf9f6] dark:bg-[#0f172a]
          bg-[radial-gradient(#e2e0d8_1px,transparent_1px)]
          dark:bg-[radial-gradient(#1e293b_1px,transparent_1px)]
          [background-size:32px_32px] opacity-60 dark:opacity-40"
        aria-hidden="true"
      />

      <div className="pt-4 flex items-center gap-2">
        <span className="inline-block -rotate-1 bg-primary text-primary-foreground px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest rounded-md">
          Profil
        </span>
        <span className="text-sm text-muted-foreground">
          Identitas akun yang sedang aktif
        </span>
      </div>

      {profile === undefined ? (
        <div className="space-y-4 rounded-2xl border border-border bg-card p-5
          shadow-[2px_3px_0px_0px_rgba(0,0,0,0.06)]
          dark:shadow-[2px_3px_0px_0px_rgba(255,255,255,0.06)]">
          <div className="flex items-center gap-4">
            <Skeleton className="h-16 w-16 rounded-2xl bg-muted" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-28 bg-muted" />
              <Skeleton className="h-4 w-40 bg-muted" />
              <Skeleton className="h-6 w-20 rounded-full bg-muted" />
            </div>
          </div>
          <Skeleton className="h-16 rounded-2xl bg-muted" />
          <Skeleton className="h-16 rounded-2xl bg-muted" />
          <Skeleton className="h-16 rounded-2xl bg-muted" />
          <Skeleton className="h-12 rounded-2xl bg-muted" />
        </div>
      ) : profile === null ? (
        <div className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground
          shadow-[2px_3px_0px_0px_rgba(0,0,0,0.06)]
          dark:shadow-[2px_3px_0px_0px_rgba(255,255,255,0.06)]">
          Profil pengguna belum tersedia.
        </div>
      ) : (
        <section className="relative rounded-2xl border border-border bg-card
          shadow-[2px_3px_0px_0px_rgba(0,0,0,0.06)]
          dark:shadow-[2px_3px_0px_0px_rgba(255,255,255,0.06)]">
          <div className="absolute -top-2 left-6 h-4 w-16 bg-primary/20 border border-primary/30 rounded-sm -rotate-1 z-10" />
          <div className="rounded-t-2xl border-b border-border bg-gradient-to-b from-primary/10 to-transparent p-5">

            <div className="flex items-start gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-xl font-semibold text-primary">
                {profile.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1 pt-1">
                <p className="truncate text-lg font-semibold text-card-foreground">{profile.name}</p>
                <p className="mt-0.5 truncate text-sm text-muted-foreground">{profile.bio || profile.email}</p>
                <div className="mt-3 flex items-center gap-2">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.16em]",
                      profile.role === "owner"
                        ? "border-amber-400/20 bg-amber-400/10 text-amber-600 dark:text-amber-300"
                        : "border-primary/20 bg-primary/10 text-primary"
                    )}
                  >
                    {profile.role}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/15 bg-emerald-400/10 px-2.5 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Aktif
                  </span>
                </div>
              </div>
              <Dialog open={isEditOpen} onOpenChange={handleEditOpenChange}>
                <DialogTrigger asChild>
                  <button
                    type="button"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                    aria-label="Edit profil"
                  >
                    <PencilLine className="h-4 w-4" />
                  </button>
                </DialogTrigger>
                <DialogContent className="border-border bg-popover text-popover-foreground sm:rounded-2xl">
                  <DialogHeader>
                    <DialogTitle>Edit profil</DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                      Ubah nama dan bio yang tampil di akun aktif.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleProfileSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <label htmlFor="name" className="text-sm text-foreground">Nama</label>
                      <Input
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="border-border bg-background text-foreground"
                        maxLength={60}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="bio" className="text-sm text-foreground">Bio</label>
                      <textarea
                        id="bio"
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        className="min-h-24 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
                        maxLength={160}
                        placeholder="Tambahkan bio singkat..."
                      />
                    </div>
                    <Button
                      type="submit"
                      className="h-11 w-full rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90"
                      disabled={isSavingProfile}
                    >
                      {isSavingProfile ? "Menyimpan..." : "Simpan perubahan"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <div className="space-y-3 p-5">
            <DetailRow icon={User2} label="Nama" value={profile.name} />
            <DetailRow icon={Mail} label="Email" value={profile.email} />
            <DetailRow icon={PencilLine} label="Bio" value={profile.bio?.trim() ? profile.bio : "Belum ada bio"} />
            <DetailRow icon={Shield} label="Peran" value={profile.role === "owner" ? "Owner" : "Admin"} />
            <Dialog open={isPasswordOpen} onOpenChange={handlePasswordOpenChange}>
              <DialogTrigger asChild>
                <button
                  type="button"
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
              </DialogTrigger>
              <DialogContent className="border-border bg-popover text-popover-foreground sm:rounded-2xl">
                <DialogHeader>
                  <DialogTitle>Ganti password</DialogTitle>
                  <DialogDescription className="text-muted-foreground">
                    Masukkan password saat ini lalu buat password baru minimal 8 karakter.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="current-password" className="text-sm text-foreground">Password saat ini</label>
                    <Input
                      id="current-password"
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="border-border bg-background text-foreground"
                      autoComplete="current-password"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="new-password" className="text-sm text-foreground">Password baru</label>
                    <Input
                      id="new-password"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="border-border bg-background text-foreground"
                      autoComplete="new-password"
                      minLength={8}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="confirm-password" className="text-sm text-foreground">Konfirmasi password baru</label>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="border-border bg-background text-foreground"
                      autoComplete="new-password"
                      minLength={8}
                      required
                    />
                  </div>
                  <Button
                    type="submit"
                    className="h-11 w-full rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90"
                    disabled={isSavingPassword}
                  >
                    {isSavingPassword ? "Menyimpan..." : "Perbarui password"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>

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

            <ThemeSwitcher />
          </div>
        </section>
      )}

      {/* Family Section */}
      <section className="relative rounded-2xl border border-border bg-card shadow-[2px_3px_0px_0px_rgba(0,0,0,0.06)] dark:shadow-[2px_3px_0px_0px_rgba(255,255,255,0.06)]">
        <div className="absolute -top-2 left-6 h-4 w-16 bg-primary/20 border border-primary/30 rounded-sm -rotate-1 z-10" />
        <div className="rounded-t-2xl border-b border-border bg-gradient-to-b from-primary/10 to-transparent p-5">
          <div className="flex items-center justify-between gap-4">
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
              <Dialog open={familyInviteOpen} onOpenChange={setFamilyInviteOpen}>
                <DialogTrigger asChild>
                  <button
                    type="button"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                    aria-label="Undang anggota keluarga"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </DialogTrigger>
              <DialogContent className="border-border bg-popover text-popover-foreground sm:rounded-2xl">
                <DialogHeader>
                  <DialogTitle>Undang Anggota Keluarga</DialogTitle>
                  <DialogDescription className="text-muted-foreground">
                    Masukkan email dan pilih wallet yang ingin dibagikan.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleFamilyInvite} className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="family-email" className="text-sm text-foreground">Email</label>
                    <Input
                      id="family-email"
                      type="email"
                      value={familyInviteEmail}
                      onChange={(e) => setFamilyInviteEmail(e.target.value)}
                      placeholder="email@contoh.com"
                      className="border-border bg-background text-foreground"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm text-foreground">Pilih Wallet</p>
                    {ownedWallets === undefined ? (
                      <div className="space-y-2">
                        <Skeleton className="h-10 rounded-xl bg-muted" />
                        <Skeleton className="h-10 rounded-xl bg-muted" />
                      </div>
                    ) : ownedWallets.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Belum ada wallet untuk dibagikan.</p>
                    ) : (
                      <div className="space-y-2">
                        {ownedWallets.map((wallet) => {
                          const selected = selectedWalletIds.has(wallet._id);
                          return (
                            <button
                              key={wallet._id}
                              type="button"
                              onClick={() => {
                                const next = new Set(selectedWalletIds);
                                if (selected) next.delete(wallet._id);
                                else next.add(wallet._id);
                                setSelectedWalletIds(next);
                              }}
                              className={cn(
                                "flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all",
                                selected
                                  ? "border-primary bg-primary/5 text-foreground"
                                  : "border-border bg-background text-muted-foreground hover:border-primary/30"
                              )}
                            >
                              {wallet.logo ? (
                                <Image
                                  src={`/bank-logo/${wallet.logo}`}
                                  alt={wallet.name}
                                  width={20}
                                  height={20}
                                  className="h-5 w-5 object-contain"
                                />
                              ) : (
                                <Wallet className="h-4 w-4" />
                              )}
                              <span className="flex-1 text-sm">{wallet.label || wallet.name}</span>
                              {selected && (
                                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                                  <Check className="h-3 w-3" />
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <Button
                    type="submit"
                    className="h-11 w-full rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90"
                    disabled={sendingFamilyInvite || selectedWalletIds.size === 0 || !familyInviteEmail.trim()}
                  >
                    {sendingFamilyInvite ? "Mengirim..." : "Kirim Undangan"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
            )}
          </div>
        </div>

        <div className="p-5">
          {familyMembers === undefined ? (
            <div className="space-y-3">
              <Skeleton className="h-14 rounded-xl bg-muted" />
              <Skeleton className="h-14 rounded-xl bg-muted" />
            </div>
          ) : familyMembers.length === 0 ? (
            <div className="py-6 text-center">
              <p className="text-sm text-muted-foreground">Belum ada anggota keluarga.</p>
              <p className="text-xs text-muted-foreground mt-1">Tekan tombol + untuk mengundang.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {familyMembers.map((member) => {
                const canManage = ownedWallets && member.wallets.some((w) => ownedWallets.some((ow) => ow._id === w._id));
                return (
                  <div
                    key={member.userId}
                    className="flex items-start gap-3 rounded-xl border border-border bg-muted/50 px-4 py-3"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-foreground">{member.name}</p>
                        {canManage && (
                          <button
                            type="button"
                            onClick={() => {
                              setManagingMember({ userId: member.userId, name: member.name });
                              setManagingMemberWallets(new Set(member.wallets.map((w) => w._id)));
                              setManageAccessOpen(true);
                            }}
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
                          <span
                            key={wallet._id}
                            className="inline-flex items-center gap-1 rounded-full border border-primary/15 bg-primary/5 px-2 py-0.5 text-[10px] font-medium text-primary"
                          >
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

        <Dialog open={manageAccessOpen} onOpenChange={setManageAccessOpen}>
          <DialogContent className="border-border bg-popover text-popover-foreground sm:rounded-2xl">
            <DialogHeader>
              <DialogTitle>Kelola Akses</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Atur wallet yang dapat diakses oleh <span className="font-medium text-foreground">{managingMember?.name}</span>.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              {ownedWallets === undefined ? (
                <div className="space-y-2">
                  <Skeleton className="h-10 rounded-xl bg-muted" />
                  <Skeleton className="h-10 rounded-xl bg-muted" />
                </div>
              ) : ownedWallets.length === 0 ? (
                <p className="text-sm text-muted-foreground">Belum ada wallet.</p>
              ) : (
                <div className="space-y-2">
                  {ownedWallets.map((wallet) => {
                    const selected = managingMemberWallets.has(wallet._id);
                    return (
                      <button
                        key={wallet._id}
                        type="button"
                        onClick={() => {
                          const next = new Set(managingMemberWallets);
                          if (selected) next.delete(wallet._id);
                          else next.add(wallet._id);
                          setManagingMemberWallets(next);
                        }}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all",
                          selected
                            ? "border-primary bg-primary/5 text-foreground"
                            : "border-border bg-background text-muted-foreground hover:border-primary/30"
                        )}
                      >
                        {wallet.logo ? (
                          <Image
                            src={`/bank-logo/${wallet.logo}`}
                            alt={wallet.name}
                            width={20}
                            height={20}
                            className="h-5 w-5 object-contain"
                          />
                        ) : (
                          <Wallet className="h-4 w-4" />
                        )}
                        <span className="flex-1 text-sm">{wallet.label || wallet.name}</span>
                        {selected && (
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                            <Check className="h-3 w-3" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              <Button
                type="button"
                onClick={handleSaveAccess}
                className="h-11 w-full rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90"
                disabled={savingAccess}
              >
                {savingAccess ? "Menyimpan..." : "Simpan Perubahan"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </section>
    </div>
  );
}
