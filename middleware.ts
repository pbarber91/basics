// middleware.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * Light-weight guard: checks for the Auth.js session cookie.
 * Do NOT import "@/lib/auth", Prisma, bcrypt, etc. from middleware.
 * Pages themselves still do robust server-side auth/role checks.
 */
function hasAuthCookie(req: NextRequest): boolean {
  // Auth.js v5 cookie names (JWT session strategy)
  return (
    req.cookies.has("__Secure-authjs.session-token") ||
    req.cookies.has("authjs.session-token")
  );
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  // Only run on protected paths (keep this list as small as possible)
  const protectedPaths = ["/admin", "/leader", "/courses"];
  const isProtected = protectedPaths.some((p) =>
    pathname === p || pathname.startsWith(`${p}/`)
  );

  if (!isProtected) return NextResponse.next();

  if (!hasAuthCookie(req)) {
    const url = req.nextUrl.clone();
    url.pathname = "/signin";
    url.searchParams.set("callbackUrl", req.nextUrl.href);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

// Limit where middleware runs to keep the bundle small and under the 1 MB Edge limit
export const config = {
  matcher: ["/admin/:path*", "/leader/:path*", "/courses/:path*"],
};
