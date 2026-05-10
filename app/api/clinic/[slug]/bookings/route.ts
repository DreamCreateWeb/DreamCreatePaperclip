import { NextResponse } from "next/server";

import { resolveBookingConfig } from "@/src/lib/booking/booking-config";
import { bookingRequestSchema } from "@/src/lib/booking/booking-schema";
import { createBooking } from "@/src/lib/booking/booking-service";
import { sendBookingNotifications } from "@/src/lib/booking/notify";
import { getClinicBySlug } from "@/src/lib/clinic/get-clinic";
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
  const limitKey = `clinic-booking:${slug}:${ip ?? "anon"}`;
  const gate = rateLimit(limitKey, RATE_LIMIT_PER_HOUR, RATE_LIMIT_WINDOW_SECONDS);
  if (!gate.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: "rate_limited",
        message:
          "We've received a lot of booking attempts from your network. Please try again shortly.",
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

  const parsed = bookingRequestSchema.safeParse(raw);
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
  const config = resolveBookingConfig(clinic);
  if (!config.enabled) {
    return NextResponse.json(
      { ok: false, error: "booking_disabled" },
      { status: 404 },
    );
  }

  const result = await createBooking(clinic, parsed.data, {
    ip,
    userAgent: req.headers.get("user-agent"),
  });
  if (!result.ok) {
    const status =
      result.reason === "slot_unavailable"
        ? 409
        : result.reason === "service_unknown"
          ? 422
          : 400;
    return NextResponse.json(
      {
        ok: false,
        error: result.reason,
        message:
          result.reason === "slot_unavailable"
            ? "That time was just booked. Please pick another."
            : result.reason === "service_unknown"
              ? "That service isn't available."
              : "We couldn't book that time. Please try again.",
      },
      { status },
    );
  }

  // Fire-and-forget email notifications. Don't fail the booking if email errors.
  try {
    await sendBookingNotifications(clinic, result.appointment);
  } catch (err) {
    console.error("[booking] notification failed", err);
  }

  return NextResponse.json({
    ok: true,
    appointment: {
      id: result.appointment.id,
      startsAt: result.appointment.startsAt,
      endsAt: result.appointment.endsAt,
      serviceName: result.appointment.serviceName,
      status: result.appointment.status,
    },
  });
}
