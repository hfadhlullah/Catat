// Auth is handled client-side via ConvexAuthProvider (react).
// Proxy only does basic path rewrites; client redirects handle auth gates.
export function proxy() {}

export const config = {
  matcher: [],
};
