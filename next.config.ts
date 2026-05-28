import type { NextConfig } from "next";

function getConvexHostname(): string | undefined {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) return undefined;
  try {
    return new URL(url).hostname;
  } catch {
    return undefined;
  }
}

const convexHostname = getConvexHostname();

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // self-hosted Convex storage (derived from env at build time)
      ...(convexHostname
        ? [{ protocol: "https" as const, hostname: convexHostname }]
        : []),
      // local dev
      { protocol: "http" as const, hostname: "127.0.0.1", port: "3212" },
      { protocol: "http" as const, hostname: "localhost" },
    ],
  },
};

export default nextConfig;
