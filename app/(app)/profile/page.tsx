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
    <div className="flex items-center gap-3 rounded-2xl border border-zinc-800/80 bg-zinc-950/70 p-4">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-zinc-900 text-zinc-300">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">{label}</p>
        <p className="mt-1 truncate text-sm font-medium text-zinc-50">{value}</p>
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
        <h1 className="text-xl font-semibold text-zinc-50">Profil</h1>
        <p className="text-zinc-400 text-sm">Identitas akun yang sedang aktif</p>
      </div>

      {profile === undefined ? (
        <div className="space-y-4 rounded-[28px] border border-zinc-800 bg-zinc-900/90 p-5">
          <div className="flex items-center gap-4">
            <Skeleton className="h-18 w-18 rounded-3xl bg-zinc-800" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-28 bg-zinc-800" />
              <Skeleton className="h-4 w-40 bg-zinc-800" />
              <Skeleton className="h-6 w-20 rounded-full bg-zinc-800" />
            </div>
          </div>
          <Skeleton className="h-18 rounded-2xl bg-zinc-800" />
          <Skeleton className="h-18 rounded-2xl bg-zinc-800" />
          <Skeleton className="h-18 rounded-2xl bg-zinc-800" />
          <Skeleton className="h-12 rounded-2xl bg-zinc-800" />
        </div>
      ) : profile === null ? (
        <div className="rounded-[28px] border border-zinc-800 bg-zinc-900/90 p-5 text-sm text-zinc-400">
          Profil pengguna belum tersedia.
        </div>
      ) : (
        <section className="overflow-hidden rounded-[28px] border border-zinc-800 bg-zinc-900/90 shadow-[0_24px_60px_rgba(0,0,0,0.35)]">
          <div className="border-b border-zinc-800 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.18),_transparent_45%),linear-gradient(180deg,rgba(24,24,27,0.98),rgba(24,24,27,0.88))] p-5">
            <div className="flex items-start gap-4">
              <div className="flex h-18 w-18 shrink-0 items-center justify-center rounded-[24px] border border-blue-400/20 bg-blue-500/10 text-2xl font-semibold text-blue-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                {profile.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1 pt-1">
                <p className="truncate text-xl font-semibold text-zinc-50">{profile.name}</p>
                <p className="mt-1 truncate text-sm text-zinc-400">{profile.bio || profile.email}</p>
                <div className="mt-3 flex items-center gap-2">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em]",
                      profile.role === "owner"
                        ? "border-amber-400/20 bg-amber-400/10 text-amber-200"
                        : "border-blue-400/20 bg-blue-400/10 text-blue-200"
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
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-zinc-700 bg-zinc-950/70 text-zinc-200 transition-colors hover:border-zinc-500 hover:text-white"
                    aria-label="Edit profil"
                  >
                    <PencilLine className="h-4 w-4" />
                  </button>
                </DialogTrigger>
                <DialogContent className="border-zinc-800 bg-zinc-950 text-zinc-50 sm:rounded-3xl">
                  <DialogHeader>
                    <DialogTitle>Edit profil</DialogTitle>
                    <DialogDescription className="text-zinc-400">
                      Ubah nama dan bio yang tampil di akun aktif.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleProfileSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <label htmlFor="name" className="text-sm text-zinc-300">Nama</label>
                      <Input
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="border-zinc-800 bg-zinc-900 text-zinc-50"
                        maxLength={60}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="bio" className="text-sm text-zinc-300">Bio</label>
                      <textarea
                        id="bio"
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        className="min-h-24 w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-50 outline-none transition-colors placeholder:text-zinc-500 focus:border-zinc-600"
                        maxLength={160}
                        placeholder="Tambahkan bio singkat..."
                      />
                    </div>
                    <Button
                      type="submit"
                      className="h-11 w-full rounded-2xl bg-blue-600 text-white hover:bg-blue-500"
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
                  className="flex w-full items-center justify-between rounded-2xl border border-zinc-800/80 bg-zinc-950/70 p-4 text-left transition-colors hover:border-zinc-700 hover:bg-zinc-900"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-zinc-900 text-zinc-300">
                      <KeyRound className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Keamanan</p>
                      <p className="mt-1 text-sm font-medium text-zinc-50">Ganti password</p>
                    </div>
                  </div>
                  <span className="text-xs text-zinc-500">Update</span>
                </button>
              </DialogTrigger>
              <DialogContent className="border-zinc-800 bg-zinc-950 text-zinc-50 sm:rounded-3xl">
                <DialogHeader>
                  <DialogTitle>Ganti password</DialogTitle>
                  <DialogDescription className="text-zinc-400">
                    Masukkan password saat ini lalu buat password baru minimal 8 karakter.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="current-password" className="text-sm text-zinc-300">Password saat ini</label>
                    <Input
                      id="current-password"
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="border-zinc-800 bg-zinc-900 text-zinc-50"
                      autoComplete="current-password"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="new-password" className="text-sm text-zinc-300">Password baru</label>
                    <Input
                      id="new-password"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="border-zinc-800 bg-zinc-900 text-zinc-50"
                      autoComplete="new-password"
                      minLength={8}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="confirm-password" className="text-sm text-zinc-300">Konfirmasi password baru</label>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="border-zinc-800 bg-zinc-900 text-zinc-50"
                      autoComplete="new-password"
                      minLength={8}
                      required
                    />
                  </div>
                  <Button
                    type="submit"
                    className="h-11 w-full rounded-2xl bg-blue-600 text-white hover:bg-blue-500"
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
              className="mt-2 h-12 w-full rounded-2xl bg-red-500/12 text-red-200 hover:bg-red-500/18"
              disabled={isSigningOut}
              onClick={handleSignOut}
            >
              <LogOut className="h-4 w-4" />
              {isSigningOut ? "Keluar..." : "Logout"}
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
