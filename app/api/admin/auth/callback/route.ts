import { NextResponse } from "next/server";

import { isAllowedAdmin } from "@/src/lib/auth/admins";
import { setSessionCookie } from "@/src/lib/auth/cookies";
import {
  consumeLoginToken,
  createSession,
  getOrCreateAdminUser,
  recordLogin,
} from "@/src/lib/auth/sessions";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  const failureUrl = new URL("/login?error=invalid", req.url);

  if (!token) {
    return NextResponse.redirect(failureUrl, 303);
  }

  const result = await consumeLoginToken(token);
  if (!result || !isAllowedAdmin(result.email)) {
    return NextResponse.redirect(failureUrl, 303);
  }

  const user = await getOrCreateAdminUser(result.email);
  const session = await createSession(user.id);
  await recordLogin(user.id);

  const response = NextResponse.redirect(new URL("/admin", req.url), 303);
  await setSessionCookie(
    response.cookies,
    session.sessionId,
    session.token,
    session.expiresAt,
  );
  return response;
}
