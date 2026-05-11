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

interface BetterStackMonitorDetail {
  data: {
    id: string;
    attributes: {
      url: string;
      pronounceable_name: string;
      status: "up" | "down" | "paused" | "validating" | "pending";
      availability: number;
      last_checked_at: string | null;
      paused: boolean;
    };
  };
}

interface BetterStackMonitorList {
  data: Array<{
    id: string;
    attributes: {
      url: string;
      pronounceable_name: string;
      status: "up" | "down" | "paused" | "validating" | "pending";
      availability: number;
      last_checked_at: string | null;
      paused: boolean;
    };
  }>;
}

export type UptimeMonitorSummary = {
  monitorId: string;
  status: "up" | "down" | "paused" | "validating" | "pending";
  availability: number;
  lastCheckedAt: string | null;
};

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
      check_frequency: 60,
      confirmation_period: 60,
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

export async function pauseUptimeMonitor(monitorId: string): Promise<void> {
  const token = getToken();
  if (!token) return;

  const res = await fetch(`${BETTERSTACK_API}/monitors/${monitorId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ paused: true }),
  });

  if (!res.ok) {
    console.error("[uptime] pauseMonitor failed", res.status);
  }
}

export async function resumeUptimeMonitor(monitorId: string): Promise<void> {
  const token = getToken();
  if (!token) return;

  const res = await fetch(`${BETTERSTACK_API}/monitors/${monitorId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ paused: false }),
  });

  if (!res.ok) {
    console.error("[uptime] resumeMonitor failed", res.status);
  }
}

export async function getUptimeMonitorSummary(
  monitorId: string,
): Promise<UptimeMonitorSummary | null> {
  const token = getToken();
  if (!token) return null;

  const res = await fetch(`${BETTERSTACK_API}/monitors/${monitorId}`, {
    headers: { Authorization: `Bearer ${token}` },
    next: { revalidate: 60 },
  });

  if (!res.ok) return null;

  const json = (await res.json()) as BetterStackMonitorDetail;
  const attr = json.data.attributes;
  return {
    monitorId,
    status: attr.status,
    availability: attr.availability ?? 100,
    lastCheckedAt: attr.last_checked_at,
  };
}

export async function listUptimeMonitors(): Promise<UptimeMonitorSummary[]> {
  const token = getToken();
  if (!token) return [];

  const res = await fetch(`${BETTERSTACK_API}/monitors?per_page=250`, {
    headers: { Authorization: `Bearer ${token}` },
    next: { revalidate: 60 },
  });

  if (!res.ok) return [];

  const json = (await res.json()) as BetterStackMonitorList;
  return json.data.map((m) => ({
    monitorId: m.id,
    status: m.attributes.status,
    availability: m.attributes.availability ?? 100,
    lastCheckedAt: m.attributes.last_checked_at,
  }));
}
