// middleware.ts
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

type Role = "USER" | "LEADER" | "ADMIN" | string;

function allowed(path: string, role?: Role) {
  // public
  if (
    path === "/" ||
    path.startsWith("/signin") ||
    path.startsWith("/api/auth") ||
    path.startsWith("/_next") ||
    path.startsWith("/images") ||
    path.startsWith("/brand") ||
    path.startsWith("/videos") ||
    path.startsWith("/captions") ||
    path.startsWith("/signup") ||
    path.startsWith("/guides")
  ) return true;

  const needsAuth = path.startsWith("/courses") || path.startsWith("/leader") || path.startsWith("/admin");
  if (!needsAuth) return true;
  if (!role) return false;

  if (path.startsWith("/courses")) return role === "USER" || role === "LEADER" || role === "ADMIN";
  if (path.startsWith("/leader"))  return role === "LEADER" || role === "ADMIN";
  if (path.startsWith("/admin"))   return role === "ADMIN";
  return true;
}

export default auth((req) => {
  const path = req.nextUrl.pathname;
  const role = (req.auth?.user as any)?.role as Role | undefined;

  if (!allowed(path, role)) {
    if (!req.auth) {
      const url = new URL("/signin", req.nextUrl);
      url.searchParams.set("callbackUrl", path + req.nextUrl.search);
      return NextResponse.redirect(url);
    }
    return NextResponse.redirect(new URL("/forbidden", req.nextUrl));
  }
  return NextResponse.next();
});

export const config = { matcher: ["/courses/:path*", "/leader/:path*", "/admin/:path*"] };
