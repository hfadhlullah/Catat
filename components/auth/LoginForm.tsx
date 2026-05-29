"use client";

import { useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useMutation, useConvexAuth } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

  useEffect(() => {
    if (isAuthenticated) {
      ensureUserProfile().finally(() => router.replace("/dashboard"));
    }
  }, [isAuthenticated, ensureUserProfile, router]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    console.log("[LoginForm] onSubmit called, mode:", mode);
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    formData.set("flow", mode);
    console.log("[LoginForm] email:", formData.get("email"), "flow:", formData.get("flow"));

    try {
      await signIn("password", formData);
      console.log("[LoginForm] signIn done — waiting for isAuthenticated");
    } catch (err: unknown) {
      console.error("[LoginForm] error:", err);
      toast.error(getAuthErrorMessage(err, mode));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="border-border bg-card shadow-lg">
      <CardHeader>
        <CardTitle className="text-card-foreground">
          {mode === "signIn" ? "Masuk" : "Daftar"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="email" className="text-foreground">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="border-border bg-background text-foreground"
              placeholder="admin@contoh.com"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="password" className="text-foreground">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete={mode === "signIn" ? "current-password" : "new-password"}
              className="border-border bg-background text-foreground"
              placeholder="Minimal 8 karakter"
            />
          </div>
          <Button
            type="submit"
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
            disabled={isLoading}
          >
            {isLoading ? "Memproses..." : mode === "signIn" ? "Masuk" : "Daftar"}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          {mode === "signIn" ? "Belum punya akun?" : "Sudah punya akun?"}{" "}
          <button
            type="button"
            onClick={() => setMode(mode === "signIn" ? "signUp" : "signIn")}
            className="text-primary hover:underline"
          >
            {mode === "signIn" ? "Daftar" : "Masuk"}
          </button>
        </p>
      </CardContent>
    </Card>
  );
}
