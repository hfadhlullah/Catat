"use client";

import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useMutation, useConvexAuth } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

function getAuthErrorMessage(error: unknown, mode: "signIn" | "signUp") {
  const message = error instanceof Error ? error.message : "";

  if (message.includes("InvalidAccountId")) {
    return mode === "signIn"
      ? "Akun belum terdaftar. Ganti ke Daftar dulu untuk membuat akun."
      : "Akun ini belum bisa diproses. Coba lagi.";
  }

  if (message.includes("Invalid credentials") || message.includes("InvalidSecret")) {
    return "Email atau password salah.";
  }

  if (message.includes("Invalid password")) {
    return "Password minimal 8 karakter.";
  }

  if (message.includes("already exists")) {
    return "Akun sudah ada. Ganti ke Masuk untuk login.";
  }

  return "Autentikasi gagal. Coba lagi.";
}

export function LoginForm() {
  const { signIn } = useAuthActions();
  const ensureUserProfile = useMutation(api.users.ensureUserProfile);
  const { isAuthenticated } = useConvexAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<"signIn" | "signUp">("signIn");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      ensureUserProfile().finally(() => router.replace("/dashboard"));
    }
  }, [isAuthenticated, ensureUserProfile, router]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    formData.set("flow", mode);

    try {
      await signIn("password", formData);
    } catch (err: unknown) {
      toast.error(getAuthErrorMessage(err, mode));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card
      shadow-[2px_3px_0px_0px_rgba(0,0,0,0.06)]
      dark:shadow-[2px_3px_0px_0px_rgba(255,255,255,0.06)]">
      <div className="grid grid-cols-2 border-b border-border bg-muted/30 p-1">
        {[
          { key: "signIn", label: "Masuk" },
          { key: "signUp", label: "Daftar" },
        ].map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setMode(item.key as "signIn" | "signUp")}
            className={cn(
              "rounded-xl px-4 py-3 text-sm font-medium transition-colors",
              mode === item.key
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
            aria-pressed={mode === item.key}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="space-y-2 p-5 pb-4">
        <h2 className="text-xl font-semibold text-card-foreground">
          {mode === "signIn" ? "Masuk ke Catat" : "Buat akun Catat"}
        </h2>
        <p className="text-sm text-muted-foreground">
          {mode === "signIn"
            ? "Lanjutkan pencatatan pengeluaran dari perangkat mana pun."
            : "Daftarkan akun untuk mulai mencatat pengeluaran dengan lebih rapi."}
        </p>
      </div>

      <div className="px-5 pb-5 space-y-4">
        <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          {mode === "signIn"
            ? "Masukkan email dan password Anda untuk langsung masuk ke dashboard."
            : "Gunakan email aktif. Password harus minimal 8 karakter."}
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-foreground">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              inputMode="email"
              className="h-11 border-border bg-background text-foreground"
              placeholder="admin@contoh.com"
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="password" className="text-foreground">Password</Label>
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
              >
                {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                {showPassword ? "Sembunyikan" : "Tampilkan"}
              </button>
            </div>
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              required
              minLength={8}
              autoComplete={mode === "signIn" ? "current-password" : "new-password"}
              className="h-11 border-border bg-background pr-3 text-foreground"
              placeholder="Minimal 8 karakter"
            />
            <p className="text-xs text-muted-foreground">
              {mode === "signIn"
                ? "Pastikan email dan password sesuai akun yang sudah terdaftar."
                : "Gunakan kombinasi password yang mudah diingat namun tetap aman."}
            </p>
          </div>
          <Button
            type="submit"
            className="h-11 w-full bg-primary text-primary-foreground hover:bg-primary/90"
            disabled={isLoading}
          >
            {isLoading ? "Memproses..." : mode === "signIn" ? "Masuk ke Dashboard" : "Buat Akun"}
          </Button>
        </form>
        <p className="text-center text-sm text-muted-foreground">
          {mode === "signIn" ? "Belum punya akun?" : "Sudah punya akun?"}{" "}
          <button
            type="button"
            onClick={() => setMode(mode === "signIn" ? "signUp" : "signIn")}
            className="font-medium text-primary hover:underline"
          >
            {mode === "signIn" ? "Daftar" : "Masuk"}
          </button>
        </p>
      </div>
    </div>
  );
}
