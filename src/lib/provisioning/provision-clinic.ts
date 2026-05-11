import { eq } from "drizzle-orm";

import { getDb, schema } from "@/src/db/client";
import { registerUptimeMonitor, removeUptimeMonitor } from "@/src/lib/uptime";
import { sendProvisioningFailure, sendProvisioningSuccess } from "@/src/lib/slack";

import { cloneTemplateRepo, deleteRepo, getRepoId } from "./github";
import {
  addSubdomain,
  addVercelEnvVars,
  createVercelProject,
  deleteVercelProject,
  disableDeploymentProtection,
  triggerDeploy,
} from "./vercel";

type ProvisioningStep = (typeof schema.provisioningStep.enumValues)[number];

async function logStep(
  clinicId: string,
  step: ProvisioningStep,
  fn: () => Promise<void>,
): Promise<void> {
  const db = getDb();
  const [run] = await db
    .insert(schema.provisioningRuns)
    .values({ clinicId, step, status: "running", startedAt: new Date() })
    .returning();

  try {
    await fn();
    await db
      .update(schema.provisioningRuns)
      .set({ status: "succeeded", completedAt: new Date() })
      .where(eq(schema.provisioningRuns.id, run.id));
  } catch (err) {
    await db
      .update(schema.provisioningRuns)
      .set({
        status: "failed",
        completedAt: new Date(),
        error: err instanceof Error ? err.message : String(err),
      })
      .where(eq(schema.provisioningRuns.id, run.id));
    throw err;
  }
}

export async function provisionClinic(clinicId: string): Promise<void> {
  const db = getDb();

  const clinic = await db.query.clinics.findFirst({
    where: eq(schema.clinics.id, clinicId),
  });
  if (!clinic) throw new Error(`Clinic not found: ${clinicId}`);

  let repoUrl: string | null = clinic.repoUrl ?? null;
  let vercelProjectId: string | null = clinic.vercelProjectId ?? null;
  let repoCloned = false;
  let vercelCreated = false;
  let uptimeMonitorId: string | null = null;
  let lastStep: ProvisioningStep = "clone";

  try {
    if (!repoUrl) {
      lastStep = "clone";
      await logStep(clinicId, "clone", async () => {
        const result = await cloneTemplateRepo(clinic.slug);
        repoUrl = result.repoUrl;
        await db
          .update(schema.clinics)
          .set({ repoUrl })
          .where(eq(schema.clinics.id, clinicId));
      });
      repoCloned = true;
    }

    lastStep = "config";
    await logStep(clinicId, "config", async () => {
      // reserved for future per-clinic customization
    });

    if (!vercelProjectId) {
      lastStep = "vercel_create";
      await logStep(clinicId, "vercel_create", async () => {
        const owner =
          process.env.GITHUB_TEMPLATE_OWNER ?? "DreamCreateWeb";
        const repoFullName = `${owner}/clinic-${clinic.slug}`;
        const result = await createVercelProject(clinic.slug, repoFullName);
        vercelProjectId = result.projectId;
        await addVercelEnvVars(vercelProjectId, clinic.slug);
        await disableDeploymentProtection(vercelProjectId);
        await db
          .update(schema.clinics)
          .set({ vercelProjectId })
          .where(eq(schema.clinics.id, clinicId));
      });
      vercelCreated = true;

      lastStep = "deploy";
      await logStep(clinicId, "deploy", async () => {
        // vercelProjectId is guaranteed set by the preceding vercel_create step
        const pid = vercelProjectId!;
        const repoId = await getRepoId(clinic.slug);
        const { deploymentUrl } = await triggerDeploy(pid, repoId);
        await db
          .update(schema.clinics)
          .set({ vercelDeploymentUrl: deploymentUrl })
          .where(eq(schema.clinics.id, clinicId));
        await addSubdomain(pid, clinic.slug);
      });

      // Uptime monitoring — soft-fail so a missing token doesn't block provisioning
      const domain = `clinic-${clinic.slug}.dreamcreate.web`;
      uptimeMonitorId = await registerUptimeMonitor(clinic.slug, domain).catch((e) => {
        console.error("[provision] uptime registration failed (non-fatal)", e);
        return null;
      });
      if (uptimeMonitorId) {
        await db
          .update(schema.clinics)
          .set({ uptimeMonitorId })
          .where(eq(schema.clinics.id, clinicId))
          .catch(() => {});
      }
    }

    await db
      .update(schema.clinics)
      .set({ status: "live" })
      .where(eq(schema.clinics.id, clinicId));

    const deploymentUrl = clinic.vercelDeploymentUrl || `https://clinic-${clinic.slug}.dreamcreate.web`;
    await sendProvisioningSuccess(clinic.name, clinic.slug, deploymentUrl);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    await sendProvisioningFailure(clinic.name, lastStep, errorMessage);

    if (uptimeMonitorId) {
      await removeUptimeMonitor(uptimeMonitorId).catch((e) => {
        console.error("[provision] rollback uptime monitor failed", e);
      });
    }
    if (vercelCreated && vercelProjectId) {
      try {
        await deleteVercelProject(vercelProjectId);
      } catch (e) {
        console.error("[provision] rollback vercel project failed", e);
      }
      await db
        .update(schema.clinics)
        .set({ vercelProjectId: null })
        .where(eq(schema.clinics.id, clinicId))
        .catch(() => {});
    }
    if (repoCloned) {
      try {
        await deleteRepo(clinic.slug);
      } catch (e) {
        console.error("[provision] rollback github repo failed", e);
      }
      await db
        .update(schema.clinics)
        .set({ repoUrl: null })
        .where(eq(schema.clinics.id, clinicId))
        .catch(() => {});
    }
    await db
      .update(schema.clinics)
      .set({ status: "draft" })
      .where(eq(schema.clinics.id, clinicId))
      .catch(() => {});
    throw err;
  }
}
