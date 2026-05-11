import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { put } from "@vercel/blob";

import { getDb, schema } from "@/src/db/client";
import { getCurrentAdminUser } from "@/src/lib/auth/current-user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/svg+xml", "image/webp"];

export async function POST(
  req: Request,
  { params }: { params: Promise<{ clinicId: string }> },
) {
  const admin = await getCurrentAdminUser();
  if (!admin) {
    return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
  }

  const { clinicId } = await params;
  const db = getDb();

  const clinic = await db.query.clinics.findFirst({
    where: eq(schema.clinics.id, clinicId),
  });
  if (!clinic) {
    return NextResponse.json({ ok: false, error: "clinic_not_found" }, { status: 404 });
  }

  const formData = await req.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "missing_file" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ ok: false, error: "invalid_file_type" }, { status: 422 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ ok: false, error: "file_too_large" }, { status: 422 });
  }

  const ext = file.name.split(".").pop() ?? "bin";
  const blob = await put(`logos/${clinicId}.${ext}`, file, {
    access: "public",
    contentType: file.type,
  });

  await db
    .update(schema.clinics)
    .set({ brand: { ...(clinic.brand ?? {}), logoUrl: blob.url } })
    .where(eq(schema.clinics.id, clinicId));

  return NextResponse.json({ ok: true, logoUrl: blob.url });
}
