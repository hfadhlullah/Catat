const CONVEX_SITE_URL = process.env.NEXT_PUBLIC_CONVEX_SITE_URL!;

export async function GET() {
  const response = await fetch(`${CONVEX_SITE_URL}/.well-known/openid-configuration`);
  const body = await response.text();
  return new Response(body, {
    status: response.status,
    headers: { "Content-Type": "application/json" },
  });
}
