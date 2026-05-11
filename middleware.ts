import { NextRequest, NextResponse } from "next/server";

import { decodeSessionCookie } from "@/src/lib/auth/crypto";
import { SESSION_COOKIE_NAME } from "@/src/lib/auth/constants";
import { OWNER_SESSION_COOKIE_NAME } from "@/src/lib/owner-auth/constants";

export const config = {
  matcher: ["/admin/:path*", "/portal/:path*"],
};

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  if (path.startsWith("/admin")) {
    const cookie = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (cookie) {
      const payload = await decodeSessionCookie(cookie);
      if (payload) return NextResponse.next();
    }
    const loginUrl = new URL("/login", req.url);
    const next = req.nextUrl.pathname + req.nextUrl.search;
    if (next && next !== "/admin") loginUrl.searchParams.set("next", next);
    return NextResponse.redirect(loginUrl);
  }

  if (path.startsWith("/portal")) {
    // Public portal routes (sign-in flow itself).
    if (path === "/portal/login" || path.startsWith("/portal/login/")) {
      return NextResponse.next();
    }
    const cookie = req.cookies.get(OWNER_SESSION_COOKIE_NAME)?.value;
    if (cookie) {
      const payload = await decodeSessionCookie(cookie);
      if (payload) return NextResponse.next();
    }
    return NextResponse.redirect(new URL("/portal/login", req.url));
  }

  return NextResponse.next();
}
