import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { decodeSessionCookie } from "@/src/lib/auth/crypto";
import { clearOwnerSessionCookie } from "@/src/lib/owner-auth/cookies";
import {
  OWNER_SESSION_COOKIE_NAME,
  revokeOwnerSession,
} from "@/src/lib/owner-auth/sessions";

export const runtime = "nodejs";

async function endSession(req: Request): Promise<NextResponse> {
  const store = await cookies();
  const raw = store.get(OWNER_SESSION_COOKIE_NAME)?.value;
  if (raw) {
    const payload = await decodeSessionCookie(raw);
    if (payload) await revokeOwnerSession(payload.sid);
  }
  const response = NextResponse.redirect(new URL("/portal/login", req.url), 303);
  clearOwnerSessionCookie(response.cookies);
  return response;
}

export async function POST(req: Request) {
  return endSession(req);
}

export async function GET(req: Request) {
  return endSession(req);
}
