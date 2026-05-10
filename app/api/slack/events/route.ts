import type { NextRequest } from "next/server";
import { verifySlackSignature } from "@/src/lib/slack";

const COMPANY_ID = "4c7f59b2-f19c-449b-af26-0cf3565c7196";
const CEO_AGENT_ID = "4e57472d-8f49-439d-bbeb-f0faf5c7aa23";
const GOAL_ID = "81179c72-ee0d-4813-b495-f9ad242b6a50";
const PROJECT_ID = "c563e27c-9c2d-4c1e-87a2-340b92b1028c";
// Dustin's DM channel with the CEO bot
const DM_CHANNEL = "D0B3HFJ5PG8";

interface SlackIssueShape {
  id: string;
  identifier: string;
  title: string;
}

export async function POST(req: NextRequest) {
  const signingSecret = process.env.SLACK_SIGNING_SECRET;
  if (!signingSecret) {
    return Response.json({ error: "SLACK_SIGNING_SECRET not configured" }, { status: 503 });
  }

  const rawBody = await req.text();
  const timestamp = req.headers.get("x-slack-request-timestamp") ?? "";
  const signature = req.headers.get("x-slack-signature") ?? "";

  if (!verifySlackSignature(rawBody, timestamp, signature, signingSecret)) {
    return Response.json({ error: "Invalid signature" }, { status: 401 });
  }

  const payload = JSON.parse(rawBody) as Record<string, unknown>;

  // Slack URL verification handshake (one-time setup)
  if (payload.type === "url_verification") {
    return Response.json({ challenge: payload.challenge });
  }

  if (payload.type !== "event_callback") {
    return Response.json({ ok: true });
  }

  const event = payload.event as Record<string, unknown>;

  // Only handle Dustin's DMs; ignore bot messages and subtypes (edits, deletes, etc.)
  if (
    event.type !== "message" ||
    event.channel !== DM_CHANNEL ||
    event.bot_id ||
    event.subtype
  ) {
    return Response.json({ ok: true });
  }

  const apiUrl = process.env.PAPERCLIP_API_URL;
  const apiKey = process.env.PAPERCLIP_API_KEY;
  if (!apiUrl || !apiKey) {
    // Return 200 so Slack does not retry — log the misconfiguration
    console.error("[slack/events] PAPERCLIP_API_URL or PAPERCLIP_API_KEY not configured");
    return Response.json({ ok: true });
  }

  const messageText = String(event.text ?? "(empty message)");
  const ts = String(event.ts ?? "");
  const today = new Date().toISOString().slice(0, 10);

  // Look for a still-open Slack DM issue from today to append to
  const searchRes = await fetch(
    `${apiUrl}/api/companies/${COMPANY_ID}/issues?q=%5BSlack+DM%5D&status=todo,in_progress&assigneeAgentId=${CEO_AGENT_ID}`,
    { headers: { Authorization: `Bearer ${apiKey}` } },
  );

  const raw: unknown = searchRes.ok ? await searchRes.json() : [];
  const existing: SlackIssueShape[] = Array.isArray(raw)
    ? (raw as SlackIssueShape[])
    : ((raw as { issues?: SlackIssueShape[] })?.issues ?? []);

  const rolling = existing.find((i) => i.title.includes(today));

  if (rolling) {
    await fetch(`${apiUrl}/api/issues/${rolling.id}/comments`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ body: `**Dustin (${ts}):** ${messageText}` }),
    });
    console.log(`[slack/events] Appended to ${rolling.identifier}`);
  } else {
    await fetch(`${apiUrl}/api/companies/${COMPANY_ID}/issues`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        title: `[Slack DM] Dustin — ${today}`,
        description: `Inbound Slack DM from Dustin.\n\n**Message (${ts}):** ${messageText}\n\n*Reply via Slack DM in channel \`${DM_CHANNEL}\`.*`,
        assigneeAgentId: CEO_AGENT_ID,
        goalId: GOAL_ID,
        projectId: PROJECT_ID,
        priority: "high",
        status: "todo",
      }),
    });
    console.log(`[slack/events] Created new [Slack DM] issue for ${today}`);
  }

  return Response.json({ ok: true });
}
