import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getDb, schema } from "@/src/db/client";
import { getCurrentAdminUser } from "@/src/lib/auth/current-user";
import { provisionClinic } from "@/src/lib/provisioning/provision-clinic";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  _req: Request,
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
  const db = getDb();

  const clinic = await db.query.clinics.findFirst({
    where: eq(schema.clinics.id, clinicId),
  });

  if (!clinic) {
    return NextResponse.json(
      { ok: false, error: "clinic_not_found" },
      { status: 404 },
    );
  }

  await db
    .update(schema.clinics)
    .set({ status: "provisioning", updatedAt: new Date() })
    .where(eq(schema.clinics.id, clinicId));

  try {
    await provisionClinic(clinicId);

    const updated = await db.query.clinics.findFirst({
      where: eq(schema.clinics.id, clinicId),
    });

    return NextResponse.json({
      ok: true,
      vercelDeploymentUrl: updated?.vercelDeploymentUrl ?? null,
    });
  } catch (err) {
    console.error("[admin/clinics/reprovision] provisioning failed", err);

    const current = await db.query.clinics.findFirst({
      where: eq(schema.clinics.id, clinicId),
    });
    if (current?.status === "provisioning") {
      await db
        .update(schema.clinics)
        .set({ status: "paused", updatedAt: new Date() })
        .where(eq(schema.clinics.id, clinicId))
        .catch(() => {});
    }

    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "server_error",
      },
      { status: 500 },
    );
  }
}
