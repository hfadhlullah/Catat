export const dynamic = "force-dynamic";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center text-muted-foreground">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground">404</h2>
        <p className="mt-2">Halaman tidak ditemukan.</p>
      </div>
    </div>
  );
}
