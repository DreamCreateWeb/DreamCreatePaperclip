const BETTERSTACK_API = "https://uptime.betterstack.com/api/v3";

function getToken(): string | null {
  return process.env.BETTERSTACK_API_TOKEN ?? null;
}

interface BetterStackMonitor {
  data: {
    id: string;
    attributes: { url: string; pronounceable_name: string };
  };
}

export async function registerUptimeMonitor(
  clinicSlug: string,
  domain: string,
): Promise<string | null> {
  const token = getToken();
  if (!token) {
    console.warn("[uptime] BETTERSTACK_API_TOKEN not set — skipping monitor registration");
    return null;
  }

  const url = domain.startsWith("http") ? domain : `https://${domain}`;
  const res = await fetch(`${BETTERSTACK_API}/monitors`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      monitor_type: "status",
      url,
      pronounceable_name: `Clinic ${clinicSlug}`,
      check_frequency: 180,
      call: false,
      sms: false,
      email: false,
      push: false,
    }),
  });

  if (!res.ok) {
    console.error("[uptime] registerMonitor failed", res.status, await res.text().catch(() => ""));
    return null;
  }

  const data = (await res.json()) as BetterStackMonitor;
  return data.data.id;
}

export async function removeUptimeMonitor(monitorId: string): Promise<void> {
  const token = getToken();
  if (!token) return;

  const res = await fetch(`${BETTERSTACK_API}/monitors/${monitorId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok && res.status !== 404) {
    console.error("[uptime] removeMonitor failed", res.status);
  }
}
