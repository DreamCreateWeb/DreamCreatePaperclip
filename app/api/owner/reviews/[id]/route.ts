import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentClinicOwner } from "@/src/lib/owner-auth/current-user";
import {
  getReviewById,
  updateReview,
} from "@/src/lib/reviews/review-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const patchSchema = z.object({
  status: z.enum(["pending", "published", "hidden"]).optional(),
  clinicResponse: z.string().max(2000).nullable().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const owner = await getCurrentClinicOwner();
  if (!owner) {
    return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
  }

  const { id } = await params;

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid_input" }, { status: 422 });
  }

  const existing = await getReviewById(id);
  if (!existing || existing.clinicId !== owner.clinic.id) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  const updated = await updateReview(id, owner.clinic.id, owner.user.id, parsed.data);
  if (!updated) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, status: updated.status });
}
