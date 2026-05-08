import { NextRequest, NextResponse } from "next/server";

import { decodeSessionCookie } from "@/src/lib/auth/crypto";
import { SESSION_COOKIE_NAME } from "@/src/lib/auth/sessions";

export const config = {
  matcher: ["/admin/:path*"],
};

export async function middleware(req: NextRequest) {
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
