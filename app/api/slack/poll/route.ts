import type { NextRequest } from "next/server";

const COMPANY_ID = "4c7f59b2-f19c-449b-af26-0cf3565c7196";
const CEO_AGENT_ID = "4e57472d-8f49-439d-bbeb-f0faf5c7aa23";
const GOAL_ID = "81179c72-ee0d-4813-b495-f9ad242b6a50";
const PROJECT_ID = "c563e27c-9c2d-4c1e-87a2-340b92b1028c";
const DM_CHANNEL = "D0B3HFJ5PG8";
const DUSTIN_USER_ID = "U0B3AMXSXU0";
const SLACK_API = "https://slack.com/api";

interface SlackMessage {
  type: string;
  subtype?: string;
  user?: string;
  bot_id?: string;
  ts: string;
  text?: string;
  reply_count?: number;
  thread_ts?: string;
}

interface SlackHistoryResponse {
  ok: boolean;
  messages?: SlackMessage[];
  error?: string;
}

interface PaperclipIssue {
  id: string;
  identifier: string;
  title: string;
}

interface PaperclipComment {
  id: string;
  body: string;
}

export async function GET(req: NextRequest) {
  // 1. Validate cron secret
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return Response.json({ error: "CRON_SECRET not configured" }, { status: 503 });
  }
  if (req.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Check required env vars
  const slackToken = process.env.SLACK_BOT_TOKEN;
  const apiUrl = process.env.PAPERCLIP_API_URL;
  const apiKey = process.env.PAPERCLIP_API_KEY;
  if (!slackToken || !apiUrl || !apiKey) {
    return Response.json(
      { error: "SLACK_BOT_TOKEN, PAPERCLIP_API_URL, or PAPERCLIP_API_KEY not configured" },
      { status: 503 },
    );
  }

  let processed = 0;
  let skipped = 0;

  try {
    // 3. Fetch recent DM history (last 90 seconds)
    const oldest = String(Date.now() / 1000 - 90);
    const historyRes = await fetch(
      `${SLACK_API}/conversations.history?channel=${DM_CHANNEL}&oldest=${oldest}&limit=50`,
      { headers: { Authorization: `Bearer ${slackToken}` } },
    );
    const historyData = (await historyRes.json()) as SlackHistoryResponse;

    if (!historyData.ok) {
      console.error(`[slack/poll] conversations.history error: ${historyData.error}`);
      return Response.json({ ok: true, processed, skipped });
    }

    const topLevelMessages: SlackMessage[] = historyData.messages ?? [];

    // 4. For messages with replies or assistant_app_thread subtype, also fetch replies
    const allMessages: SlackMessage[] = [...topLevelMessages];

    for (const msg of topLevelMessages) {
      if ((msg.reply_count ?? 0) > 0 || msg.subtype?.includes("assistant_app_thread")) {
        try {
          const repliesRes = await fetch(
            `${SLACK_API}/conversations.replies?channel=${DM_CHANNEL}&ts=${msg.ts}&limit=50`,
            { headers: { Authorization: `Bearer ${slackToken}` } },
          );
          const repliesData = (await repliesRes.json()) as SlackHistoryResponse;
          if (repliesData.ok && repliesData.messages) {
            allMessages.push(...repliesData.messages);
          }
        } catch (err) {
          console.error(`[slack/poll] conversations.replies error for ts=${msg.ts}:`, err);
        }
      }
    }

    // 5. Deduplicate by ts
    const seen = new Map<string, SlackMessage>();
    for (const msg of allMessages) {
      if (!seen.has(msg.ts)) {
        seen.set(msg.ts, msg);
      }
    }

    // 6. Filter to Dustin's messages only
    const BLOCKED_SUBTYPES = new Set(["bot_message", "message_changed", "message_deleted"]);
    const dustinMessages = Array.from(seen.values()).filter(
      (msg) =>
        msg.user === DUSTIN_USER_ID &&
        !msg.bot_id &&
        !BLOCKED_SUBTYPES.has(msg.subtype ?? ""),
    );

    // 7. Sort ascending by ts
    dustinMessages.sort((a, b) => (a.ts < b.ts ? -1 : a.ts > b.ts ? 1 : 0));

    // 8. Process each Dustin message
    for (const msg of dustinMessages) {
      const today = new Date().toISOString().slice(0, 10);
      const msgText = msg.text ?? "(empty message)";

      // 8b. Search for today's Slack DM issue
      let existingIssue: PaperclipIssue | undefined;
      try {
        const searchRes = await fetch(
          `${apiUrl}/api/companies/${COMPANY_ID}/issues?q=%5BSlack+DM%5D&status=todo,in_progress&assigneeAgentId=${CEO_AGENT_ID}`,
          { headers: { Authorization: `Bearer ${apiKey}` } },
        );
        const raw: unknown = searchRes.ok ? await searchRes.json() : [];
        const issues: PaperclipIssue[] = Array.isArray(raw)
          ? (raw as PaperclipIssue[])
          : ((raw as { issues?: PaperclipIssue[] })?.issues ?? []);
        existingIssue = issues.find((i) => i.title.includes(today));
      } catch (err) {
        console.error(`[slack/poll] Error searching issues:`, err);
        continue;
      }

      if (existingIssue) {
        // 8c. Issue exists — check if this ts is already recorded in comments
        let alreadyLogged = false;
        try {
          const commentsRes = await fetch(`${apiUrl}/api/issues/${existingIssue.id}/comments`, {
            headers: { Authorization: `Bearer ${apiKey}` },
          });
          if (commentsRes.ok) {
            const commentsRaw: unknown = await commentsRes.json();
            const comments: PaperclipComment[] = Array.isArray(commentsRaw)
              ? (commentsRaw as PaperclipComment[])
              : ((commentsRaw as { comments?: PaperclipComment[] })?.comments ?? []);
            alreadyLogged = comments.some((c) => c.body.includes(msg.ts));
          }
        } catch (err) {
          console.error(`[slack/poll] Error fetching comments for issue ${existingIssue.id}:`, err);
        }

        if (alreadyLogged) {
          skipped++;
          continue;
        }

        // Append comment
        try {
          await fetch(`${apiUrl}/api/issues/${existingIssue.id}/comments`, {
            method: "POST",
            headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({ body: `**Dustin (${msg.ts}):** ${msgText}` }),
          });
          console.log(`[slack/poll] Appended ts=${msg.ts} to ${existingIssue.identifier}`);
          processed++;
        } catch (err) {
          console.error(`[slack/poll] Error posting comment for ts=${msg.ts}:`, err);
        }
      } else {
        // 8d. No issue for today — create one
        try {
          await fetch(`${apiUrl}/api/companies/${COMPANY_ID}/issues`, {
            method: "POST",
            headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              title: `[Slack DM] Dustin — ${today}`,
              description: `Inbound Slack DM from Dustin.\n\n**Message (${msg.ts}):** ${msgText}\n\n*Reply via Slack DM in channel \`${DM_CHANNEL}\`.*`,
              assigneeAgentId: CEO_AGENT_ID,
              goalId: GOAL_ID,
              projectId: PROJECT_ID,
              priority: "high",
              status: "todo",
            }),
          });
          console.log(`[slack/poll] Created new [Slack DM] issue for ${today}`);
          processed++;
        } catch (err) {
          console.error(`[slack/poll] Error creating issue for ts=${msg.ts}:`, err);
        }
      }
    }
  } catch (err) {
    console.error(`[slack/poll] Unexpected error:`, err);
  }

  return Response.json({ ok: true, processed, skipped });
}
