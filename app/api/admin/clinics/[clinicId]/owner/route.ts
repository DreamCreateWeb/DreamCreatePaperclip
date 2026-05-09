import { NextResponse } from "next/server";

import { getCurrentAdminUser } from "@/src/lib/auth/current-user";
import { flattenZodErrors } from "@/src/lib/onboarding/schema";
import { adminInviteOwnerSchema } from "@/src/lib/owner-portal/admin-invite-schema";
import { inviteClinicOwner } from "@/src/lib/owner-portal/admin-invite-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getAppOrigin(req: Request): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL;
  if (fromEnv) return fromEnv.replace(/\/+$/, "");
  return new URL(req.url).origin;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ clinicId: string }> },
) {
  const admin = await getCurrentAdminUser();
  if (!admin) {
    return NextResponse.json(
      { ok: false, error: "unauthenticated" },
      { status: 401 },
    );
  }

  const { clinicId } = await params;

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid_json" },
      { status: 400 },
    );
  }

  const parsed = adminInviteOwnerSchema.safeParse(raw);
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

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  let result;
  try {
    result = await inviteClinicOwner({
      clinicId,
      email: parsed.data.email,
      adminEmail: admin.email,
      appOrigin: getAppOrigin(req),
      ip,
    });
  } catch (err) {
    console.error("[admin/clinics/owner] invite failed", err);
    return NextResponse.json(
      { ok: false, error: "server_error" },
      { status: 500 },
    );
  }

  if (!result.ok) {
    if (result.error === "clinic_not_found") {
      return NextResponse.json(
        { ok: false, error: "clinic_not_found" },
        { status: 404 },
      );
    }
    return NextResponse.json(
      {
        ok: false,
        error: result.error,
        fieldErrors: {
          email: ["This email is already linked to another clinic."],
        },
      },
      { status: 409 },
    );
  }

  return NextResponse.json({
    ok: true,
    replaced: result.replaced,
    ownerEmail: result.owner.email,
  });
}
