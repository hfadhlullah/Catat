import { NextRequest } from "next/server";

const CONVEX_SITE_URL = process.env.NEXT_PUBLIC_CONVEX_SITE_URL!;

// Proxy auth actions to self-hosted Convex HTTP actions endpoint
async function handler(request: NextRequest) {
  const url = new URL(request.url);
  const targetUrl = `${CONVEX_SITE_URL}/api/auth${url.pathname.replace("/api/auth", "")}${url.search}`;

  const headers = new Headers(request.headers);
  headers.set("host", new URL(CONVEX_SITE_URL).host);

  const body = request.method !== "GET" && request.method !== "HEAD"
    ? await request.arrayBuffer()
    : undefined;

  const response = await fetch(targetUrl, {
    method: request.method,
    headers,
    body,
  });

  const responseHeaders = new Headers(response.headers);
  return new Response(response.body, {
    status: response.status,
    headers: responseHeaders,
  });
}

export { handler as GET, handler as POST };
