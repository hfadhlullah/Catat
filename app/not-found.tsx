export const dynamic = "force-dynamic";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center text-zinc-400">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-zinc-50">404</h2>
        <p className="mt-2">Halaman tidak ditemukan.</p>
      </div>
    </div>
  );
}
