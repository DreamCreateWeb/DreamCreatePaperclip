const VERCEL_API = "https://api.vercel.com";

function getVercelToken(): string {
  const token = process.env.VERCEL_TOKEN;
  if (!token) throw new Error("VERCEL_TOKEN is not set");
  return token;
}

function getTeamId(): string {
  return process.env.VERCEL_TEAM_ID ?? "team_JCkmr9YSdUoHDEI9kLvznwCc";
}

async function vercelFetch(path: string, init: RequestInit): Promise<Response> {
  const sep = path.includes("?") ? "&" : "?";
  const url = `${VERCEL_API}${path}${sep}teamId=${getTeamId()}`;
  return fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${getVercelToken()}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
}

export async function createVercelProject(
  slug: string,
  repoFullName: string,
): Promise<{ projectId: string }> {
  const res = await vercelFetch("/v10/projects", {
    method: "POST",
    body: JSON.stringify({
      name: `clinic-${slug}`,
      framework: "nextjs",
      gitRepository: {
        type: "github",
        repo: repoFullName,
      },
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Vercel createProject failed: ${res.status} ${err}`);
  }
  const data = (await res.json()) as { id: string };
  return { projectId: data.id };
}

export async function addVercelEnvVars(
  projectId: string,
  clinicSlug: string,
): Promise<void> {
  const res = await vercelFetch(`/v10/projects/${projectId}/env`, {
    method: "POST",
    body: JSON.stringify([
      {
        key: "CLINIC_SLUG",
        value: clinicSlug,
        type: "plain",
        target: ["production", "preview", "development"],
      },
    ]),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Vercel addEnvVars failed: ${res.status} ${err}`);
  }
}

export async function triggerDeploy(
  projectId: string,
): Promise<{ deploymentUrl: string }> {
  const res = await vercelFetch("/v13/deployments", {
    method: "POST",
    body: JSON.stringify({
      name: `clinic-${projectId}`,
      project: projectId,
      target: "production",
      gitSource: {
        type: "github",
        ref: "main",
      },
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Vercel triggerDeploy failed: ${res.status} ${err}`);
  }
  const data = (await res.json()) as { url: string };
  return { deploymentUrl: `https://${data.url}` };
}

export async function addSubdomain(
  projectId: string,
  slug: string,
): Promise<void> {
  const domain = `clinic-${slug}.dreamcreate.web`;
  const res = await vercelFetch(`/v9/projects/${projectId}/domains`, {
    method: "POST",
    body: JSON.stringify({ name: domain }),
  });
  if (!res.ok) {
    console.warn(
      `[vercel] addSubdomain soft-fail for ${domain}:`,
      res.status,
      await res.text().catch(() => ""),
    );
  }
}

export async function deleteVercelProject(projectId: string): Promise<void> {
  const res = await vercelFetch(`/v9/projects/${projectId}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Vercel deleteProject failed: ${res.status} ${err}`);
  }
}
