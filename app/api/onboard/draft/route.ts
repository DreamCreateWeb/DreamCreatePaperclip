import { NextResponse } from "next/server";

import { upsertOnboardingDraft } from "@/src/lib/onboarding/draft-service";
import { getMailer } from "@/src/lib/auth/mailer";
import { clientIp, rateLimit } from "@/src/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RATE_LIMIT_PER_HOUR = 20;
const RATE_LIMIT_WINDOW_SECONDS = 60 * 60;

export async function POST(req: Request) {
  const ip = clientIp(req);
  const limitKey = `onboard-draft:${ip ?? "anon"}`;
  const gate = rateLimit(limitKey, RATE_LIMIT_PER_HOUR, RATE_LIMIT_WINDOW_SECONDS);
  if (!gate.ok) {
    return NextResponse.json(
      { ok: false, error: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(gate.retryAfterSeconds) } },
    );
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  if (
    !raw ||
    typeof raw !== "object" ||
    typeof (raw as Record<string, unknown>).email !== "string" ||
    !(raw as Record<string, unknown>).formState ||
    typeof (raw as Record<string, unknown>).formState !== "object"
  ) {
    return NextResponse.json({ ok: false, error: "invalid_input" }, { status: 422 });
  }

  const body = raw as { email: string; formState: Record<string, unknown>; lastStep?: unknown };
  const email = body.email.trim();
  if (!email.includes("@")) {
    return NextResponse.json({ ok: false, error: "invalid_email" }, { status: 422 });
  }

  const lastStep = typeof body.lastStep === "number" ? body.lastStep : 1;

  try {
    const { token, emailAlreadySentRecently } = await upsertOnboardingDraft(
      email,
      body.formState,
      lastStep,
    );

    if (!emailAlreadySentRecently) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://dreamcreateweb.com";
      const resumeUrl = `${appUrl}/onboard?token=${encodeURIComponent(token)}`;
      const mailer = getMailer();
      await mailer.sendOnboardingResumeLink({ to: email, url: resumeUrl });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[onboard/draft] upsert failed", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
