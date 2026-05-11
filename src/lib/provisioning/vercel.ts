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
  const gitCredentialId =
    process.env.VERCEL_GIT_CREDENTIAL_ID ??
    "cred_8cc5d0c38956382722981719b6eeedec6dedeb0e";

  const res = await vercelFetch("/v10/projects", {
    method: "POST",
    body: JSON.stringify({
      name: `clinic-${slug}`,
      framework: "nextjs",
      gitRepository: {
        type: "github",
        repo: repoFullName,
        gitCredentialId,
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
  const envVars: Array<{ key: string; value: string; type: string; target: string[] }> = [
    {
      key: "CLINIC_SLUG",
      value: clinicSlug,
      type: "plain",
      target: ["production", "preview", "development"],
    },
  ];

  // Propagate Sentry DSN from platform to clinic Vercel project
  const sentryDsn = process.env.SENTRY_DSN;
  if (sentryDsn) {
    envVars.push(
      { key: "SENTRY_DSN", value: sentryDsn, type: "plain", target: ["production", "preview", "development"] },
      { key: "NEXT_PUBLIC_SENTRY_DSN", value: sentryDsn, type: "plain", target: ["production", "preview", "development"] },
    );
  }

  const res = await vercelFetch(`/v10/projects/${projectId}/env`, {
    method: "POST",
    body: JSON.stringify(envVars),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Vercel addEnvVars failed: ${res.status} ${err}`);
  }
}

export async function triggerDeploy(
  projectId: string,
  repoId: number,
): Promise<{ deploymentUrl: string }> {
  const res = await vercelFetch("/v13/deployments", {
    method: "POST",
    body: JSON.stringify({
      name: `clinic-${projectId}`,
      project: projectId,
      target: "production",
      gitSource: {
        type: "github",
        repoId,
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
