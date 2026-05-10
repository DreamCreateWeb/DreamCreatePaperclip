import { eq } from "drizzle-orm";

import { getDb, schema } from "@/src/db/client";

import { cloneTemplateRepo, deleteRepo } from "./github";
import {
  addSubdomain,
  addVercelEnvVars,
  createVercelProject,
  deleteVercelProject,
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

  try {
    if (!repoUrl) {
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

    await logStep(clinicId, "config", async () => {
      // reserved for future per-clinic customization
    });

    if (!vercelProjectId) {
      await logStep(clinicId, "vercel_create", async () => {
        const owner =
          process.env.GITHUB_TEMPLATE_OWNER ?? "DreamCreateWeb";
        const repoFullName = `${owner}/clinic-${clinic.slug}`;
        const result = await createVercelProject(clinic.slug, repoFullName);
        vercelProjectId = result.projectId;
        await addVercelEnvVars(vercelProjectId, clinic.slug);
        await db
          .update(schema.clinics)
          .set({ vercelProjectId })
          .where(eq(schema.clinics.id, clinicId));
      });
      vercelCreated = true;

      await logStep(clinicId, "deploy", async () => {
        // vercelProjectId is guaranteed set by the preceding vercel_create step
        const pid = vercelProjectId!;
        const { deploymentUrl } = await triggerDeploy(pid);
        await db
          .update(schema.clinics)
          .set({ vercelDeploymentUrl: deploymentUrl })
          .where(eq(schema.clinics.id, clinicId));
        await addSubdomain(pid, clinic.slug);
      });
    }

    await db
      .update(schema.clinics)
      .set({ status: "live" })
      .where(eq(schema.clinics.id, clinicId));
  } catch (err) {
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
