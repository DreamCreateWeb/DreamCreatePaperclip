import type { NextRequest } from "next/server";

const COMPANY_ID = "4c7f59b2-f19c-449b-af26-0cf3565c7196";
const CEO_AGENT_ID = "4e57472d-8f49-439d-bbeb-f0faf5c7aa23";
const GOAL_ID = "81179c72-ee0d-4813-b495-f9ad242b6a50";
const PROJECT_ID = "c563e27c-9c2d-4c1e-87a2-340b92b1028c";

const DESCRIPTION = `Produce today's Daily Briefing for Dustin. Format:

**Shipped** — What landed yesterday/overnight?
**In-Flight** — Active tasks and their current status?
**Queued** — What is next up?
**Decisions needed** — Anything blocking that Dustin needs to call?
**Recommendation** — One thing to prioritize today.

Post as a comment on this issue. Once Slack is wired, also post to #ceo-board.`;

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return Response.json({ error: "CRON_SECRET not configured" }, { status: 503 });
  }
  if (req.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiUrl = process.env.PAPERCLIP_API_URL;
  const apiKey = process.env.PAPERCLIP_API_KEY;
  if (!apiUrl || !apiKey) {
    return Response.json(
      { error: "PAPERCLIP_API_URL or PAPERCLIP_API_KEY not configured" },
      { status: 503 },
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  const res = await fetch(`${apiUrl}/api/companies/${COMPANY_ID}/issues`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: `Daily Briefing — ${today}`,
      assigneeAgentId: CEO_AGENT_ID,
      goalId: GOAL_ID,
      projectId: PROJECT_ID,
      priority: "medium",
      status: "todo",
      description: DESCRIPTION,
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "<no body>");
    console.error(`[cron/daily-briefing] Paperclip API error ${res.status}: ${detail}`);
    return Response.json({ error: "upstream_error", status: res.status }, { status: 502 });
  }

  const issue = (await res.json()) as { id: string; identifier: string };
  console.log(`[cron/daily-briefing] Created ${issue.identifier} (${issue.id})`);
  return Response.json({ ok: true, issueId: issue.id, identifier: issue.identifier });
}
