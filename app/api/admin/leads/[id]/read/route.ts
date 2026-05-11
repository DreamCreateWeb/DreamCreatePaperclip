import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getCurrentAdminUser } from "@/src/lib/auth/current-user";
import { getDb, schema } from "@/src/db/client";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getCurrentAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const db = getDb();

  await db
    .update(schema.leads)
    .set({ readAt: new Date() })
    .where(eq(schema.leads.id, id));

  return NextResponse.json({ success: true });
}
