export const dynamic = "force-dynamic";

import { CatatLogo } from "@/components/brand/CatatLogo";
import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-8">
      {/* Paper texture */}
      <div
        className="fixed inset-0 -z-10
          bg-[#faf9f6] dark:bg-[#0f172a]
          bg-[radial-gradient(#e2e0d8_1px,transparent_1px)]
          dark:bg-[radial-gradient(#1e293b_1px,transparent_1px)]
          [background-size:32px_32px] opacity-60 dark:opacity-40"
        aria-hidden="true"
      />

      <div className="w-full max-w-sm">
        <div className="mb-5 flex justify-center">
          <CatatLogo className="h-16 sm:h-20" />
        </div>

        <div className="relative mb-6 rounded-2xl border border-border bg-card p-5 text-center
          shadow-[2px_3px_0px_0px_rgba(0,0,0,0.06)]
          dark:shadow-[2px_3px_0px_0px_rgba(255,255,255,0.06)]">
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 h-4 w-20 bg-primary/20 border border-primary/30 rounded-sm -rotate-1 z-10" />

          <h1 className="text-xl font-semibold text-card-foreground">
            Kelola pengeluaran lebih rapi
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Masuk untuk melanjutkan pencatatan dan pemantauan pengeluaran dari perangkat mobile maupun desktop.
          </p>
        </div>

        <LoginForm />
      </div>
    </div>
  );
}
