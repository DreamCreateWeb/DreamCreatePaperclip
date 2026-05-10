import { NextResponse } from "next/server";
import { z } from "zod";

import {
  getAppointmentById,
  updateAppointmentStatus,
} from "@/src/lib/booking/booking-service";
import { sendBookingStatusEmail } from "@/src/lib/booking/notify";
import { getCurrentClinicOwner } from "@/src/lib/owner-auth/current-user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const patchSchema = z.object({
  status: z.enum(["confirmed", "cancelled", "completed", "no_show", "pending"]),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const owner = await getCurrentClinicOwner();
  if (!owner) {
    return NextResponse.json(
      { ok: false, error: "unauthenticated" },
      { status: 401 },
    );
  }

  const { id } = await params;
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid_json" },
      { status: 400 },
    );
  }

  const parsed = patchSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "invalid_input" },
      { status: 422 },
    );
  }

  const existing = await getAppointmentById(id);
  if (!existing || existing.clinicId !== owner.clinic.id) {
    return NextResponse.json(
      { ok: false, error: "not_found" },
      { status: 404 },
    );
  }

  const updated = await updateAppointmentStatus(
    id,
    owner.clinic.id,
    owner.user.id,
    parsed.data.status,
  );
  if (!updated) {
    return NextResponse.json(
      { ok: false, error: "not_found" },
      { status: 404 },
    );
  }

  // Notify patient on visible state changes (best-effort).
  if (
    parsed.data.status === "confirmed" ||
    parsed.data.status === "cancelled" ||
    parsed.data.status === "completed"
  ) {
    try {
      await sendBookingStatusEmail(owner.clinic, updated);
    } catch (err) {
      console.error("[booking] status email failed", err);
    }
  }

  return NextResponse.json({ ok: true, status: updated.status });
}
