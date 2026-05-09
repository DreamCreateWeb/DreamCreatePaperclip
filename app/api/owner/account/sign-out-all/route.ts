import { NextResponse } from "next/server";

import { getCurrentClinicOwner } from "@/src/lib/owner-auth/current-user";
import { clearOwnerSessionCookie } from "@/src/lib/owner-auth/cookies";
import { revokeAllOwnerSessions } from "@/src/lib/owner-auth/sessions";

export const runtime = "nodejs";

async function signOutEverywhere(req: Request): Promise<NextResponse> {
  const owner = await getCurrentClinicOwner();
  if (!owner) {
    const response = NextResponse.redirect(
      new URL("/portal/login", req.url),
      303,
    );
    clearOwnerSessionCookie(response.cookies);
    return response;
  }
  await revokeAllOwnerSessions(owner.user.id);
  const response = NextResponse.redirect(
    new URL("/portal/login?signed_out=all", req.url),
    303,
  );
  clearOwnerSessionCookie(response.cookies);
  return response;
}

export async function POST(req: Request) {
  return signOutEverywhere(req);
}
