export const dynamic = "force-dynamic";

import { CatatLogo } from "@/components/brand/CatatLogo";
import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="mb-4 flex justify-center">
          <CatatLogo className="h-16 sm:h-20" />
        </div>
        <div className="mb-6 rounded-2xl border border-border/70 bg-background/80 p-5 text-center shadow-sm backdrop-blur">
          <h1 className="text-xl font-semibold text-foreground">Kelola pengeluaran lebih rapi</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Masuk untuk melanjutkan pencatatan dan pemantauan pengeluaran dari perangkat mobile maupun desktop.
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
