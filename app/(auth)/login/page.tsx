export const dynamic = "force-dynamic";

import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-zinc-50">Catat</h1>
          <p className="text-zinc-400 mt-1 text-sm">Pencatatan pengeluaran konstruksi</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
