import { NextResponse } from "next/server";

import { getAvailability } from "@/src/lib/booking/availability";
import { resolveBookingConfig } from "@/src/lib/booking/booking-config";
import { getClinicBySlug } from "@/src/lib/clinic/get-clinic";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
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

  const url = new URL(req.url);
  const date = url.searchParams.get("date");
  if (!date) {
    return NextResponse.json(
      { ok: false, error: "missing_date" },
      { status: 422 },
    );
  }

  const result = await getAvailability(clinic, date);
  return NextResponse.json({ ok: true, ...result });
}
