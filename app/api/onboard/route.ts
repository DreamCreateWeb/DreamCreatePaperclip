import { NextResponse } from "next/server";

import { createOnboardingSubmission } from "@/src/lib/onboarding/service";
import {
  flattenZodErrors,
  onboardingSchema,
} from "@/src/lib/onboarding/schema";
import { clientIp, rateLimit } from "@/src/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RATE_LIMIT_PER_HOUR = 5;
const RATE_LIMIT_WINDOW_SECONDS = 60 * 60;

export async function POST(req: Request) {
  const ip = clientIp(req);
  const limitKey = `onboard:${ip ?? "anon"}`;
  const gate = rateLimit(limitKey, RATE_LIMIT_PER_HOUR, RATE_LIMIT_WINDOW_SECONDS);
  if (!gate.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: "rate_limited",
        message:
          "We've received a lot of requests from your network. Please try again shortly.",
      },
      {
        status: 429,
        headers: { "Retry-After": String(gate.retryAfterSeconds) },
      },
    );
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid_json" },
      { status: 400 },
    );
  }

  const parsed = onboardingSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: "invalid_input",
        fieldErrors: flattenZodErrors(parsed.error),
      },
      { status: 422 },
    );
  }

  if (parsed.data.nickname && parsed.data.nickname.length > 0) {
    // Honeypot tripped — pretend it succeeded so bots don't probe further.
    return NextResponse.json({ ok: true, slug: "queued" });
  }

  try {
    const result = await createOnboardingSubmission(parsed.data, {
      ip,
      userAgent: req.headers.get("user-agent"),
    });
    return NextResponse.json({
      ok: true,
      clinicId: result.clinicId,
      slug: result.slug,
      submissionId: result.submissionId,
    });
  } catch (err) {
    console.error("[onboard] create failed", err);
    return NextResponse.json(
      {
        ok: false,
        error: "server_error",
        message: "Something went wrong saving your submission. Please try again.",
      },
      { status: 500 },
    );
  }
}
