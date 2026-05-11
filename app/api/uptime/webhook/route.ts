import type { NextRequest } from "next/server";
import { sendSlackDm } from "@/src/lib/slack";

export const runtime = "nodejs";

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

  const emoji = isDown ? ":red_circle:" : ":large_green_circle:";
  const state = isDown ? "DOWN" : "UP";
  const siteLabel = monitorUrl ?? "unknown site";

  const text = `${emoji} *[Uptime Alert]* ${siteLabel} is *${state}*${cause ? ` — ${cause}` : ""}\n_${new Date().toISOString()}_`;

  await sendSlackDm(text);

  return Response.json({ ok: true });
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
