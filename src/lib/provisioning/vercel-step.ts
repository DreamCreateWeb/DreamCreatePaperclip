import { eq } from "drizzle-orm";

import { getDb, schema } from "@/src/db/client";
import { getRepoId } from "./github";
import {
  addSubdomain,
  addVercelEnvVars,
  createVercelProject,
  disableDeploymentProtection,
  triggerDeploy,
  waitForDeployment,
} from "./vercel";

const DEPLOY_TIMEOUT_MS = 5 * 60 * 1_000;

async function notifyGoogleChat(message: string): Promise<void> {
  const url = process.env.GOOGLE_CHAT_WEBHOOK;
  if (!url) return;
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: message }),
  }).catch((e) => console.warn("[vercel-step] Google Chat notify failed:", e));
}

export async function vercelProvisionStep(
  clinicId: string,
): Promise<{ deploymentUrl: string; projectId: string }> {
  const db = getDb();
  const clinic = await db.query.clinics.findFirst({
    where: eq(schema.clinics.id, clinicId),
  });
  if (!clinic) throw new Error(`Clinic not found: ${clinicId}`);
  if (!clinic.repoUrl) {
    throw new Error(`Clinic ${clinicId} has no repoUrl — run github-step first`);
  }

  const owner = process.env.GITHUB_TEMPLATE_OWNER ?? "DreamCreateWeb";
  const repoFullName = `${owner}/dreamcreate-${clinic.slug}`;

  const { projectId } = await createVercelProject(clinic.slug, repoFullName);
  await addVercelEnvVars(projectId, clinic.slug);
  await disableDeploymentProtection(projectId);

  await db
    .update(schema.clinics)
    .set({ vercelProjectId: projectId })
    .where(eq(schema.clinics.id, clinicId));

  const repoId = await getRepoId(clinic.slug);
  const { deploymentUrl, deploymentId } = await triggerDeploy(projectId, repoId);

  await waitForDeployment(deploymentId, DEPLOY_TIMEOUT_MS).catch((e) => {
    console.warn("[vercel-step] deployment wait timed out (non-fatal)", e);
  });

  await db
    .update(schema.clinics)
    .set({ vercelDeploymentUrl: deploymentUrl, status: "live" })
    .where(eq(schema.clinics.id, clinicId));

  await addSubdomain(projectId, clinic.slug);
  await notifyGoogleChat(`✅ ${clinic.name} is live at ${deploymentUrl}`);

  return { deploymentUrl, projectId };
}
