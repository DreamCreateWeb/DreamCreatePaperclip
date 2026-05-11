import type { NextRequest } from "next/server";

const COMPANY_ID = "4c7f59b2-f19c-449b-af26-0cf3565c7196";
const CEO_AGENT_ID = "4e57472d-8f49-439d-bbeb-f0faf5c7aa23";
const GOAL_ID = "81179c72-ee0d-4813-b495-f9ad242b6a50";
const PROJECT_ID = "c563e27c-9c2d-4c1e-87a2-340b92b1028c";
const DRE_66_ISSUE_ID = "d68991cc-610f-4c75-9768-48bdbcbc68f3";
const DRE_67_ISSUE_ID = "d3f5b026-d66b-40fa-b45d-6a010cb5b38f";

const DESCRIPTION = `Weekly platform review. Your job this heartbeat:

1. Open the Platform Improvements Backlog ([DRE-67](/DRE/issues/${DRE_67_ISSUE_ID})). Read the current backlog.
2. Audit dev-team utilization: check what CTO and dev tiers are working on. Are there idle tiers? Bottlenecks?
3. File 3–7 new improvement issues into the backlog (use parentId = "${DRE_67_ISSUE_ID}" and projectId = "${PROJECT_ID}"). Focus on gaps, polish, and recurring pain points.
4. Post a recap comment on [DRE-66](/DRE/issues/${DRE_66_ISSUE_ID}) summarising what you reviewed and what you filed.

Keep it tight — this is a weekly health check, not a planning session.`;

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
      title: `Weekly Platform Review — ${today}`,
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
    console.error(`[cron/weekly-review] Paperclip API error ${res.status}: ${detail}`);
    return Response.json({ error: "upstream_error", status: res.status }, { status: 502 });
  }

  const issue = (await res.json()) as { id: string; identifier: string };
  console.log(`[cron/weekly-review] Created ${issue.identifier} (${issue.id})`);
  return Response.json({ ok: true, issueId: issue.id, identifier: issue.identifier });
}
