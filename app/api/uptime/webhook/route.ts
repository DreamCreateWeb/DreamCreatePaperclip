import type { NextRequest } from "next/server";
import { sendSlackDm } from "@/src/lib/slack";
import { getDb } from "@/src/db/client";
import { clinics } from "@/src/db/schema";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";

interface FailureState {
  count: number;
  firstFailAt: Date;
  lastAlertAt: Date | null;
  lastSuccessAt: Date | null;
}

// Module-level state: track failure counts per URL (best-effort; resets on serverless warm reboot)
const failureMap = new Map<string, FailureState>();

// BetterStack (and most uptime providers) POST JSON on downtime/recovery events.
// Authenticate via ?secret=<UPTIME_WEBHOOK_SECRET> in the webhook URL.
export async function POST(req: NextRequest) {
  const secret = process.env.UPTIME_WEBHOOK_SECRET;
  if (secret) {
    const provided = req.nextUrl.searchParams.get("secret");
    if (provided !== secret) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Support BetterStack v3 JSON:API format and simpler flat formats (UptimeRobot etc.)
  const monitorUrl = extractMonitorUrl(body);
  const isDown = extractIsDown(body);
  const cause = extractCause(body);

  if (!monitorUrl) {
    return Response.json({ ok: true });
  }

  const now = new Date();
  const state = failureMap.get(monitorUrl) ?? {
    count: 0,
    firstFailAt: now,
    lastAlertAt: null,
    lastSuccessAt: null,
  };

  if (isDown) {
    // Down event: increment failure count
    state.count++;
    state.firstFailAt = state.count === 1 ? now : state.firstFailAt;

    // Check if we should send an alert:
    // - Count reached 2 (consecutive failures)
    // - No recent alert (dedup window: 10 min)
    const shouldAlert =
      state.count >= 2 && (!state.lastAlertAt || now.getTime() - state.lastAlertAt.getTime() > 10 * 60 * 1000);

    if (shouldAlert) {
      const clinicName = await getClinicNameFromUrl(monitorUrl);
      const lastSuccess = state.lastSuccessAt?.toISOString() ?? "N/A";
      const text =
        `:red_circle: *[Clinic Down]* ${clinicName || monitorUrl}\n` +
        `URL: ${monitorUrl}\n` +
        `Last success: ${lastSuccess}\n` +
        `Error: ${cause || "Unknown"}\n` +
        `_Consecutive failures: ${state.count}_`;
      await sendSlackDm(text);
      state.lastAlertAt = now;
    }

    failureMap.set(monitorUrl, state);
  } else {
    // Recovery event: reset count and send recovery alert if we previously alerted
    const wasDown = state.count > 0;
    state.count = 0;
    state.lastSuccessAt = now;

    if (wasDown && state.lastAlertAt) {
      const clinicName = await getClinicNameFromUrl(monitorUrl);
      const text =
        `:large_green_circle: *[Clinic Recovered]* ${clinicName || monitorUrl} is back up.\n` +
        `_${now.toISOString()}_`;
      await sendSlackDm(text);
    }

    failureMap.set(monitorUrl, state);
  }

  return Response.json({ ok: true });
}

async function getClinicNameFromUrl(url: string): Promise<string | null> {
  try {
    // Extract slug from URL: https://slug.dreamcreate.web or similar
    const match = url.match(/\/\/([a-z0-9-]+)\.dreamcreate\.web/i) || url.match(/\/\/([a-z0-9-]+)\./i);
    if (!match?.[1]) return null;

    const slug = match[1];
    const db = getDb();
    const [clinic] = await db.select({ name: clinics.name }).from(clinics).where(eq(clinics.slug, slug)).limit(1);
    return clinic?.name ?? null;
  } catch (err) {
    console.error("[uptime-webhook] Failed to lookup clinic name:", err);
    return null;
  }
}

function extractMonitorUrl(body: Record<string, unknown>): string | null {
  // BetterStack v3: body.data.relationships.monitor embedded, or body.monitor.url
  const monitor = body.monitor as Record<string, unknown> | undefined;
  if (monitor?.url) return String(monitor.url);

  const data = body.data as Record<string, unknown> | undefined;
  if (data) {
    const included = (body.included as Array<Record<string, unknown>>) ?? [];
    const monitorIncluded = included.find((i) => i.type === "monitor") as Record<string, unknown> | undefined;
    const attrs = monitorIncluded?.attributes as Record<string, unknown> | undefined;
    if (attrs?.url) return String(attrs.url);
  }

  // UptimeRobot flat format
  if (body.monitor_url) return String(body.monitor_url);
  if (body.url) return String(body.url);

  return null;
}

function extractIsDown(body: Record<string, unknown>): boolean {
  // BetterStack: incident.attributes.status === "started" means down
  const data = body.data as Record<string, unknown> | undefined;
  const attrs = data?.attributes as Record<string, unknown> | undefined;
  if (attrs) {
    if (attrs.status === "started") return true;
    if (attrs.status === "resolved") return false;
  }

  // UptimeRobot: alert_type 1 = down, 2 = up
  const alertType = body.alert_type ?? body.alertType;
  if (alertType !== undefined) return Number(alertType) === 1;

  // Generic "down" flag
  if (typeof body.down === "boolean") return body.down;

  return true; // default: treat unknown events as down alerts
}

function extractCause(body: Record<string, unknown>): string | null {
  const data = body.data as Record<string, unknown> | undefined;
  const attrs = data?.attributes as Record<string, unknown> | undefined;
  if (attrs?.cause) return String(attrs.cause);
  if (body.cause) return String(body.cause);
  if (body.reason) return String(body.reason);
  return null;
}
