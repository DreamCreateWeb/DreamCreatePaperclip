import { NextResponse } from "next/server";

import { flattenZodErrors } from "@/src/lib/onboarding/schema";
import { getCurrentClinicOwner } from "@/src/lib/owner-auth/current-user";
import { brandUpdateSchema } from "@/src/lib/owner-portal/brand-schema";
import { revalidateClinicSite } from "@/src/lib/owner-portal/clinic-update-helpers";
import { applyBrandUpdate } from "@/src/lib/owner-portal/section-update-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(req: Request) {
  const owner = await getCurrentClinicOwner();
  if (!owner) {
    return NextResponse.json(
      { ok: false, error: "unauthenticated" },
      { status: 401 },
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

  const parsed = brandUpdateSchema.safeParse(raw);
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

  try {
    await applyBrandUpdate(
      { ownerUserId: owner.user.id, clinicId: owner.clinic.id },
      parsed.data.brand,
    );
  } catch (err) {
    console.error("[owner/clinic/brand] update failed", err);
    return NextResponse.json(
      { ok: false, error: "server_error" },
      { status: 500 },
    );
  }

  revalidateClinicSite(owner.clinic.slug);
  return NextResponse.json({ ok: true });
}
