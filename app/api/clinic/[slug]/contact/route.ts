import { NextResponse } from "next/server";

import {
  contactMessageSchema,
  type ContactMessagePayload,
} from "@/src/lib/clinic/contact-schema";
import { storeContactMessage } from "@/src/lib/clinic/contact-service";
import { getClinicIdBySlug } from "@/src/lib/clinic/get-clinic";
import { flattenZodErrors } from "@/src/lib/onboarding/schema";
import { clientIp, rateLimit } from "@/src/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RATE_LIMIT_PER_HOUR = 5;
const RATE_LIMIT_WINDOW_SECONDS = 60 * 60;

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const ip = clientIp(req);
  const limitKey = `clinic-contact:${slug}:${ip ?? "anon"}`;
  const gate = rateLimit(
    limitKey,
    RATE_LIMIT_PER_HOUR,
    RATE_LIMIT_WINDOW_SECONDS,
  );
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

  const parsed = contactMessageSchema.safeParse(raw);
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

  const data: ContactMessagePayload = parsed.data;
  if (data.nickname && data.nickname.length > 0) {
    return NextResponse.json({ ok: true, queued: true });
  }

  const clinicId = await getClinicIdBySlug(slug);
  if (!clinicId) {
    return NextResponse.json(
      { ok: false, error: "not_found" },
      { status: 404 },
    );
  }

  try {
    const result = await storeContactMessage(clinicId, data, {
      ip,
      userAgent: req.headers.get("user-agent"),
    });
    return NextResponse.json({ ok: true, id: result.id });
  } catch (err) {
    console.error("[clinic-contact] store failed", err);
    return NextResponse.json(
      {
        ok: false,
        error: "server_error",
        message:
          "Something went wrong sending your message. Please try again.",
      },
      { status: 500 },
    );
  }
}
