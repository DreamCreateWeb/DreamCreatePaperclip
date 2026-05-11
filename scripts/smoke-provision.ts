/**
 * QA smoke test — DRE-99: Provisioning pipeline
 * Run: GITHUB_TOKEN=$GH_TOKEN npx tsx scripts/smoke-provision.ts
 */

import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

import { getDb, closeDb, schema } from "@/src/db/client";
import { provisionClinic } from "@/src/lib/provisioning/provision-clinic";
import { deleteRepo } from "@/src/lib/provisioning/github";
import { deleteVercelProject } from "@/src/lib/provisioning/vercel";

const SLUG = "qa-smoke-20260511";
const CLINIC_NAME = "QA Smoke Test Clinic";
const VERCEL_TEAM_ID =
  process.env.VERCEL_TEAM_ID ?? "team_JCkmr9YSdUoHDEI9kLvznwCc";
const GH_ORG = process.env.GITHUB_TEMPLATE_OWNER ?? "DreamCreateWeb";

const log = (step: string, msg: string) =>
  console.log(`[${step}] ${new Date().toISOString()} — ${msg}`);
const pass = (step: string, msg: string) =>
  console.log(`✅ PASS [${step}] ${msg}`);
const fail = (step: string, msg: string) => {
  console.error(`❌ FAIL [${step}] ${msg}`);
  process.exitCode = 1;
};

async function vercelFetch(path: string, init: RequestInit = {}) {
  const sep = path.includes("?") ? "&" : "?";
  return fetch(
    `https://api.vercel.com${path}${sep}teamId=${VERCEL_TEAM_ID}`,
    {
      ...init,
      headers: {
        Authorization: `Bearer ${process.env.VERCEL_TOKEN}`,
        "Content-Type": "application/json",
        ...(init.headers as Record<string, string>),
      },
    },
  );
}

async function waitForDeployReady(
  projectId: string,
  maxWaitMs = 5 * 60_000,
): Promise<{ state: string; url: string | null }> {
  const deadline = Date.now() + maxWaitMs;
  while (Date.now() < deadline) {
    const res = await vercelFetch(
      `/v6/deployments?projectId=${projectId}&limit=1`,
    );
    if (!res.ok) {
      await new Promise((r) => setTimeout(r, 5_000));
      continue;
    }
    const data = (await res.json()) as {
      deployments: Array<{ readyState: string; url: string }>;
    };
    const deploy = data.deployments[0];
    if (!deploy) {
      await new Promise((r) => setTimeout(r, 5_000));
      continue;
    }
    log("deploy-poll", `readyState=${deploy.readyState} url=${deploy.url}`);
    if (deploy.readyState === "READY" || deploy.readyState === "ERROR") {
      return { state: deploy.readyState, url: deploy.url ?? null };
    }
    await new Promise((r) => setTimeout(r, 10_000));
  }
  return { state: "TIMEOUT", url: null };
}

async function main() {
  const db = getDb();
  let clinicId: string | null = null;
  let vercelProjectId: string | null = null;
  let repoCreated = false;

  try {
    // ── Step 1: Insert test clinic ─────────────────────
    log("setup", `Inserting test clinic slug=${SLUG}`);
    const [inserted] = await db
      .insert(schema.clinics)
      .values({
        id: randomUUID(),
        slug: SLUG,
        name: CLINIC_NAME,
        status: "draft",
        contactEmail: "qa-smoke@dreamcreate.test",
      })
      .returning();
    clinicId = inserted.id;
    log("setup", `Clinic inserted id=${clinicId}`);

    // ── Step 2: Run provisionClinic() ──────────────────
    log("provision", "Calling provisionClinic()…");
    await provisionClinic(clinicId);
    log("provision", "provisionClinic() returned without error");

    // ── Step 3: Verify DB row ──────────────────────────
    const clinic = await db.query.clinics.findFirst({
      where: eq(schema.clinics.id, clinicId),
    });
    if (!clinic) {
      fail("db", "Clinic row missing after provisioning");
    } else {
      if (clinic.status === "live") {
        pass("db", `status=${clinic.status}`);
      } else {
        fail("db", `status=${clinic.status} (expected live)`);
      }
      if (clinic.repoUrl?.includes(SLUG)) {
        pass("db", `repoUrl=${clinic.repoUrl}`);
      } else {
        fail("db", `repoUrl missing or wrong: ${clinic.repoUrl}`);
      }
      if (clinic.vercelProjectId) {
        pass("db", `vercelProjectId=${clinic.vercelProjectId}`);
        vercelProjectId = clinic.vercelProjectId;
      } else {
        fail("db", "vercelProjectId missing");
      }
      if (clinic.vercelDeploymentUrl) {
        pass("db", `vercelDeploymentUrl=${clinic.vercelDeploymentUrl}`);
      } else {
        fail("db", "vercelDeploymentUrl missing");
      }
    }

    // ── Step 4: Verify GitHub repo ─────────────────────
    log("github", `Checking repo ${GH_ORG}/clinic-${SLUG}`);
    const ghRes = await fetch(
      `https://api.github.com/repos/${GH_ORG}/clinic-${SLUG}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
          Accept: "application/vnd.github.v3+json",
        },
      },
    );
    if (ghRes.ok) {
      const ghData = (await ghRes.json()) as { full_name: string; id: number };
      pass("github", `Repo exists: ${ghData.full_name} (id=${ghData.id})`);
      repoCreated = true;
    } else {
      fail("github", `Repo not found: HTTP ${ghRes.status}`);
    }

    // ── Step 5: Verify Vercel project + deploy READY ───
    if (vercelProjectId) {
      log("vercel", `Checking project ${vercelProjectId}`);
      const projRes = await vercelFetch(`/v9/projects/${vercelProjectId}`);
      if (projRes.ok) {
        const projData = (await projRes.json()) as { name: string; id: string };
        pass("vercel", `Project exists: ${projData.name} (id=${projData.id})`);
      } else {
        fail("vercel", `Project not found: HTTP ${projRes.status}`);
      }

      log("vercel", "Polling for deployment READY (up to 5 min)…");
      const { state, url } = await waitForDeployReady(vercelProjectId);
      if (state === "READY") {
        pass("vercel", `Deploy READY — url=https://${url}`);
        console.log(
          `\n📸 DEPLOYMENT READY SNAPSHOT\n  URL: https://${url}\n  State: READY\n  Project: ${vercelProjectId}\n  Slug: ${SLUG}\n`,
        );

        // ── Step 6: Verify public URL ──────────────────
        log("public-url", `Fetching https://${url}`);
        try {
          const siteRes = await fetch(`https://${url}`, {
            redirect: "follow",
            signal: AbortSignal.timeout(15_000),
          });
          if (siteRes.ok || siteRes.status === 302 || siteRes.status === 301) {
            pass("public-url", `HTTP ${siteRes.status} from https://${url}`);
          } else {
            fail("public-url", `HTTP ${siteRes.status} from https://${url}`);
          }
        } catch (e) {
          fail(
            "public-url",
            `Fetch error: ${e instanceof Error ? e.message : e}`,
          );
        }
      } else {
        fail("vercel", `Deploy did not reach READY — state=${state}`);
      }
    }
  } catch (err) {
    fail(
      "provision",
      `Uncaught error: ${err instanceof Error ? err.message : err}`,
    );
    console.error(err);
  } finally {
    // ── Step 7: Cleanup ────────────────────────────────
    log("cleanup", "Starting cleanup…");

    if (clinicId) {
      try {
        await db.delete(schema.clinics).where(eq(schema.clinics.id, clinicId));
        log("cleanup", `DB row deleted for clinicId=${clinicId}`);
      } catch (e) {
        console.error("cleanup: failed to delete DB row", e);
      }
    }

    if (vercelProjectId) {
      try {
        await deleteVercelProject(vercelProjectId);
        log("cleanup", `Vercel project deleted: ${vercelProjectId}`);
      } catch (e) {
        console.error("cleanup: failed to delete Vercel project", e);
      }
    }

    if (repoCreated) {
      try {
        await deleteRepo(SLUG);
        log("cleanup", `GitHub repo deleted: clinic-${SLUG}`);
      } catch (e) {
        console.error("cleanup: failed to delete GitHub repo", e);
      }
    }

    await closeDb();
    log("cleanup", "Done.");
  }
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
