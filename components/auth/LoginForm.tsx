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
  }, [isAuthenticated]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    console.log("[LoginForm] onSubmit called, mode:", mode);
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    formData.set("flow", mode);
    console.log("[LoginForm] email:", formData.get("email"), "flow:", formData.get("flow"));

    try {
      console.log("[LoginForm] calling signIn...");
      await signIn("password", formData);
      console.log("[LoginForm] signIn done — waiting for isAuthenticated");
    } catch (err: any) {
      console.error("[LoginForm] error:", err);
      toast.error(err.message ?? "Gagal masuk. Coba lagi.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <CardTitle className="text-zinc-50">
          {mode === "signIn" ? "Masuk" : "Daftar"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="email" className="text-zinc-300">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="bg-zinc-800 border-zinc-700 text-zinc-50"
              placeholder="admin@contoh.com"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="password" className="text-zinc-300">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              autoComplete={mode === "signIn" ? "current-password" : "new-password"}
              className="bg-zinc-800 border-zinc-700 text-zinc-50"
              placeholder="••••••••"
            />
          </div>
          <Button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-500 text-white"
            disabled={isLoading}
          >
            {isLoading ? "Memproses..." : mode === "signIn" ? "Masuk" : "Daftar"}
          </Button>
        </form>
        <p className="text-center text-sm text-zinc-500 mt-4">
          {mode === "signIn" ? "Belum punya akun?" : "Sudah punya akun?"}{" "}
          <button
            type="button"
            onClick={() => setMode(mode === "signIn" ? "signUp" : "signIn")}
            className="text-blue-400 hover:underline"
          >
            {mode === "signIn" ? "Daftar" : "Masuk"}
          </button>
        </p>
      </CardContent>
    </Card>
  );
}
