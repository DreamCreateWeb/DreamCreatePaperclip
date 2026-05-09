import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { flattenZodErrors } from "@/src/lib/onboarding/schema";
import { getCurrentClinicOwner } from "@/src/lib/owner-auth/current-user";
import { siteUpdateSchema } from "@/src/lib/owner-portal/site-update-schema";
import { applySiteUpdate } from "@/src/lib/owner-portal/site-update-service";

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

  const parsed = siteUpdateSchema.safeParse(raw);
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
    await applySiteUpdate(owner.clinic.id, owner.user.id, parsed.data);
  } catch (err) {
    console.error("[owner/clinic] update failed", err);
    return NextResponse.json(
      { ok: false, error: "server_error" },
      { status: 500 },
    );
  }

  // Revalidate the public clinic site so changes show up immediately.
  revalidatePath(`/sites/${owner.clinic.slug}`);
  revalidatePath(`/sites/${owner.clinic.slug}/contact`);
  revalidatePath(`/sites/${owner.clinic.slug}/services`);
  revalidatePath(`/sites/${owner.clinic.slug}/team`);

  return NextResponse.json({ ok: true });
}
