import crypto from "crypto";

const CEO_DM_CHANNEL = "D0B3HFJ5PG8";

export async function sendSlackDm(text: string, channel = CEO_DM_CHANNEL): Promise<void> {
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) {
    console.error("[slack] SLACK_BOT_TOKEN not set — cannot send DM");
    return;
  }
  const res = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ channel, text }),
  });
  if (!res.ok) {
    console.error("[slack] chat.postMessage HTTP error", res.status);
    return;
  }
  const data = (await res.json()) as { ok: boolean; error?: string };
  if (!data.ok) {
    console.error("[slack] chat.postMessage error:", data.error);
  }
}

/**
 * Verifies a Slack request signature using HMAC-SHA256.
 * Rejects requests older than 5 minutes.
 */
export function verifySlackSignature(
  rawBody: string,
  timestamp: string,
  signature: string,
  secret: string,
): boolean {
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;
  const base = `v0:${timestamp}:${rawBody}`;
  const expected = `v0=${crypto.createHmac("sha256", secret).update(base).digest("hex")}`;
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}
