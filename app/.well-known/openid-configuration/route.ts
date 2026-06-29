import { NextRequest } from "next/server";

const CONVEX_SITE_URL = process.env.NEXT_PUBLIC_CONVEX_SITE_URL!;

async function handler(request: NextRequest) {
  const targetUrl = `${CONVEX_SITE_URL}/.well-known/openid-configuration`;
  const response = await fetch(targetUrl, {
    headers: { host: new URL(CONVEX_SITE_URL).host },
  });
  const body = await response.text();
  return new Response(body, {
    status: response.status,
    headers: { "Content-Type": "application/json" },
  });
}

export { handler as GET };
