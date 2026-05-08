import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { clearSessionCookie } from "@/src/lib/auth/cookies";
import { decodeSessionCookie } from "@/src/lib/auth/crypto";
import { SESSION_COOKIE_NAME, revokeSession } from "@/src/lib/auth/sessions";

export const runtime = "nodejs";

async function endSession(req: Request): Promise<NextResponse> {
  const store = await cookies();
  const raw = store.get(SESSION_COOKIE_NAME)?.value;
  if (raw) {
    const payload = await decodeSessionCookie(raw);
    if (payload) await revokeSession(payload.sid);
  }
  const response = NextResponse.redirect(new URL("/login", req.url), 303);
  clearSessionCookie(response.cookies);
  return response;
}

export async function POST(req: Request) {
  return endSession(req);
}

export async function GET(req: Request) {
  return endSession(req);
}
