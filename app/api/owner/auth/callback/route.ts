import { NextResponse } from "next/server";

import { setOwnerSessionCookie } from "@/src/lib/owner-auth/cookies";
import {
  consumeOwnerLoginToken,
  createOwnerSession,
  findOwnerByEmail,
  recordOwnerLogin,
} from "@/src/lib/owner-auth/sessions";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  const failureUrl = new URL("/portal/login?error=invalid", req.url);

  if (!token) {
    return NextResponse.redirect(failureUrl, 303);
  }

  const consumed = await consumeOwnerLoginToken(token);
  if (!consumed) {
    return NextResponse.redirect(failureUrl, 303);
  }

  const owner = await findOwnerByEmail(consumed.email);
  if (!owner) {
    return NextResponse.redirect(failureUrl, 303);
  }

  const session = await createOwnerSession(owner.user.id);
  await recordOwnerLogin(owner.user.id);

  const response = NextResponse.redirect(new URL("/portal", req.url), 303);
  await setOwnerSessionCookie(
    response.cookies,
    session.sessionId,
    session.token,
    session.expiresAt,
  );
  return response;
}
