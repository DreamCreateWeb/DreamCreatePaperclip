import type { NextRequest } from "next/server";

import { getDb } from "@/src/db/client";
import { pruneOldStripeEvents } from "@/src/lib/stripe/idempotency";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return Response.json({ error: "CRON_SECRET not configured" }, { status: 503 });
  }
  if (req.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = getDb();
    const deleted = await pruneOldStripeEvents(db);
    console.log(`[cron/stripe-event-cleanup] pruned ${deleted} events`);
    return Response.json({ deleted });
  } catch (err) {
    console.error("[cron/stripe-event-cleanup] failed", err);
    return Response.json({ error: "server_error" }, { status: 500 });
  }
}
