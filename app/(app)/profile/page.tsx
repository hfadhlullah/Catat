"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProfilePage() {
  const router = useRouter();
  const { signOut } = useAuthActions();
  const profile = useQuery(api.users.getCurrentUserProfile);
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function handleSignOut() {
    setIsSigningOut(true);

    try {
      await signOut();
      router.replace("/login");
    } finally {
      setIsSigningOut(false);
    }
  }

  return (
    <div className="p-4 max-w-lg mx-auto space-y-4">
      <div className="pt-4">
        <h1 className="text-xl font-semibold text-zinc-50">Profil</h1>
        <p className="text-zinc-400 text-sm">Identitas akun yang sedang aktif</p>
      </div>

      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-zinc-50">Identity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {profile === undefined ? (
            <div className="space-y-3">
              <Skeleton className="h-12 bg-zinc-800" />
              <Skeleton className="h-12 bg-zinc-800" />
              <Skeleton className="h-12 bg-zinc-800" />
            </div>
          ) : profile === null ? (
            <p className="text-sm text-zinc-400">Profil pengguna belum tersedia.</p>
          ) : (
            <div className="space-y-3 text-sm">
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
                <p className="text-zinc-500">Nama</p>
                <p className="mt-1 text-zinc-50">{profile.name}</p>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
                <p className="text-zinc-500">Email</p>
                <p className="mt-1 text-zinc-50">{profile.email}</p>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
                <p className="text-zinc-500">Role</p>
                <p className="mt-1 text-zinc-50 capitalize">{profile.role}</p>
              </div>
            </div>
          )}

          <Button
            type="button"
            variant="destructive"
            className="w-full"
            disabled={isSigningOut}
            onClick={handleSignOut}
          >
            {isSigningOut ? "Keluar..." : "Logout"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
