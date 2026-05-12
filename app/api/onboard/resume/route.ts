import { NextResponse } from "next/server";

import { getDraftByToken } from "@/src/lib/onboarding/draft-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  if (!token || token.length < 10) {
    return NextResponse.json({ ok: false, error: "missing_token" }, { status: 400 });
  }

  try {
    const result = await getDraftByToken(token);
    if (!result) {
      return NextResponse.json({ ok: false, error: "not_found_or_expired" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, payload: result.payload, lastStep: result.lastStep });
  } catch (err) {
    console.error("[onboard/resume] lookup failed", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
