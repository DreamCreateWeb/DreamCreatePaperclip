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

  if (clinic.status !== "pending_payment" && clinic.status !== "draft") {
    return NextResponse.json(
      { ok: false, error: "invalid_status", currentStatus: clinic.status },
      { status: 422 },
    );
  }

  await db
    .update(schema.clinics)
    .set({ status: "provisioning" })
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
    console.error("[admin/clinics/provision] provisioning failed", err);

    const current = await db.query.clinics.findFirst({
      where: eq(schema.clinics.id, clinicId),
    });
    if (current?.status === "provisioning") {
      await db
        .update(schema.clinics)
        .set({ status: "draft" })
        .where(eq(schema.clinics.id, clinicId))
        .catch(() => {});
    }

    const failedStep =
      err instanceof Error && err.message.includes("failed:")
        ? err.message.split(" failed:")[0].replace("Vercel ", "").toLowerCase()
        : undefined;

    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "server_error",
        failedStep,
      },
      { status: 500 },
    );
  }
}
