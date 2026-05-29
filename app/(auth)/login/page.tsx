export const dynamic = "force-dynamic";

import { CatatLogo } from "@/components/brand/CatatLogo";
import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="flex justify-center">
            <CatatLogo className="h-12" />
          </div>
          <p className="mt-3 text-sm text-muted-foreground">Pencatatan pengeluaran konstruksi</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
