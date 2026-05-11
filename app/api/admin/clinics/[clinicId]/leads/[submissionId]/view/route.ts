import { and, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

import { getCurrentAdminUser } from "@/src/lib/auth/current-user";
import { getDb, schema } from "@/src/db/client";

type Params = Promise<{ clinicId: string; submissionId: string }>;

export async function POST(req: NextRequest, { params }: { params: Params }) {
  const admin = await getCurrentAdminUser();
  if (!admin)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { clinicId, submissionId } = await params;
  const db = getDb();

  const [submission] = await db
    .select({ id: schema.intakeSubmissions.id })
    .from(schema.intakeSubmissions)
    .where(
      and(
        eq(schema.intakeSubmissions.id, submissionId),
        eq(schema.intakeSubmissions.clinicId, clinicId),
      ),
    )
    .limit(1);

  if (!submission)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.insert(schema.auditEvents).values({
    actor: `admin:${admin.id}`,
    action: "admin.intake.submission_viewed",
    entityType: "intake_submission",
    entityId: submissionId,
    payload: { clinicId },
  });

  return NextResponse.json({ ok: true });
}
