"use client";

import { type ElementType, type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthActions } from "@convex-dev/auth/react";
import { useAction, useMutation, useQuery } from "convex/react";
import { KeyRound, LogOut, Mail, PencilLine, Shield, User2 } from "lucide-react";
import { api } from "@/convex/_generated/api";
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
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-background/70 p-4">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
        <p className="mt-1 truncate text-sm font-medium text-foreground">{value}</p>
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

  return (
    <div className="mx-auto max-w-lg space-y-5 p-4">
      <div className="pt-4">
        <h1 className="text-xl font-semibold text-foreground">Profil</h1>
        <p className="text-sm text-muted-foreground">Identitas akun yang sedang aktif</p>
      </div>

      {profile === undefined ? (
        <div className="space-y-4 rounded-[28px] border border-border bg-card/90 p-5 shadow-sm">
          <div className="flex items-center gap-4">
            <Skeleton className="h-18 w-18 rounded-3xl bg-muted" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-28 bg-muted" />
              <Skeleton className="h-4 w-40 bg-muted" />
              <Skeleton className="h-6 w-20 rounded-full bg-muted" />
            </div>
          </div>
          <Skeleton className="h-18 rounded-2xl bg-muted" />
          <Skeleton className="h-18 rounded-2xl bg-muted" />
          <Skeleton className="h-18 rounded-2xl bg-muted" />
          <Skeleton className="h-12 rounded-2xl bg-muted" />
        </div>
      ) : profile === null ? (
        <div className="rounded-[28px] border border-border bg-card/90 p-5 text-sm text-muted-foreground shadow-sm">
          Profil pengguna belum tersedia.
        </div>
      ) : (
        <section className="overflow-hidden rounded-[28px] border border-border bg-card/90 shadow-lg">
          <div className="border-b border-border bg-[radial-gradient(circle_at_top_left,color-mix(in_oklab,var(--primary)_18%,transparent),transparent_45%),linear-gradient(180deg,color-mix(in_oklab,var(--card)_92%,transparent),var(--card))] p-5">
            <div className="flex items-start gap-4">
              <div className="flex h-18 w-18 shrink-0 items-center justify-center rounded-[24px] border border-primary/20 bg-primary/12 text-2xl font-semibold text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                {profile.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1 pt-1">
                <p className="truncate text-xl font-semibold text-card-foreground">{profile.name}</p>
                <p className="mt-1 truncate text-sm text-muted-foreground">{profile.bio || profile.email}</p>
                <div className="mt-3 flex items-center gap-2">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em]",
                      profile.role === "owner"
                        ? "border-amber-400/20 bg-amber-400/10 text-amber-200"
                        : "border-primary/20 bg-primary/10 text-primary"
                    )}
                  >
                    {profile.role}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/15 bg-emerald-400/10 px-3 py-1 text-[11px] font-medium text-emerald-200">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                    Aktif
                  </span>
                </div>
              </div>
              <Dialog open={isEditOpen} onOpenChange={handleEditOpenChange}>
                <DialogTrigger asChild>
                  <button
                    type="button"
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-border bg-background/80 text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                    aria-label="Edit profil"
                  >
                    <PencilLine className="h-4 w-4" />
                  </button>
                </DialogTrigger>
                <DialogContent className="border-border bg-popover text-popover-foreground sm:rounded-3xl">
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
                        className="min-h-24 w-full rounded-2xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
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
                  className="flex w-full items-center justify-between rounded-2xl border border-border bg-background/80 p-4 text-left transition-colors hover:border-primary/30 hover:bg-accent"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground">
                      <KeyRound className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Keamanan</p>
                      <p className="mt-1 text-sm font-medium text-card-foreground">Ganti password</p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">Update</span>
                </button>
              </DialogTrigger>
              <DialogContent className="border-border bg-popover text-popover-foreground sm:rounded-3xl">
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
              className="mt-2 h-12 w-full rounded-2xl bg-destructive/12 text-destructive hover:bg-destructive/18"
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
    </div>
  );
}
