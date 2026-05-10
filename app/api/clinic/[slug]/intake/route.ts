import { NextResponse } from "next/server";

import { getClinicBySlug } from "@/src/lib/clinic/get-clinic";
import {
  createIntakeSubmission,
  getActiveTemplateForClinic,
} from "@/src/lib/intake/intake-service";
import { intakeSubmitSchema } from "@/src/lib/intake/intake-schema";
import { flattenZodErrors } from "@/src/lib/onboarding/schema";
import { clientIp, rateLimit } from "@/src/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RATE_LIMIT_PER_HOUR = 10;
const RATE_LIMIT_WINDOW_SECONDS = 60 * 60;

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const ip = clientIp(req);
  const limitKey = `clinic-intake:${slug}:${ip ?? "anon"}`;
  const gate = rateLimit(limitKey, RATE_LIMIT_PER_HOUR, RATE_LIMIT_WINDOW_SECONDS);
  if (!gate.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: "rate_limited",
        message: "Too many submissions. Please try again shortly.",
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

  const parsed = intakeSubmitSchema.safeParse(raw);
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
    return NextResponse.json({ ok: true, queued: true });
  }

  const clinic = await getClinicBySlug(slug);
  if (!clinic) {
    return NextResponse.json(
      { ok: false, error: "not_found" },
      { status: 404 },
    );
  }

  const template = await getActiveTemplateForClinic(clinic.id);
  if (!template) {
    return NextResponse.json(
      { ok: false, error: "no_template", message: "Intake form is not available." },
      { status: 404 },
    );
  }

  const submission = await createIntakeSubmission(
    clinic.id,
    template.id,
    parsed.data,
    { ip },
  );

  return NextResponse.json({ ok: true, submissionId: submission.id });
}
