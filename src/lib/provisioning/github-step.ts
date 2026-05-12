import { eq } from "drizzle-orm";
import { Octokit } from "@octokit/rest";

import { getDb, schema } from "@/src/db/client";

function getOctokit(): Octokit {
  const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
  if (!token) throw new Error("GITHUB_TOKEN (or GH_TOKEN) is not set");
  return new Octokit({ auth: token });
}

function templateOwner(): string {
  return process.env.GITHUB_TEMPLATE_OWNER ?? "DreamCreateWeb";
}

function templateRepo(): string {
  return process.env.GITHUB_TEMPLATE_REPO ?? "DreamCreate-Master-Template";
}

export function generateClinicConfig(
  clinic: typeof schema.clinics.$inferSelect,
): string {
  const configObject = {
    slug: clinic.slug,
    name: clinic.name,
    email: clinic.contactEmail,
    phone: clinic.contactPhone,
    address: clinic.address,
    hours: clinic.hours,
    services: clinic.services,
    team: clinic.team,
    brand: {
      primaryColor: clinic.brand?.primaryColor,
      accentColor: clinic.brand?.accentColor,
      logoUrl: clinic.brand?.logoUrl,
    },
    booking: {
      enabled: clinic.bookingConfig?.enabled ?? true,
    },
    reviews: {
      enabled: clinic.reviewConfig?.enabled ?? true,
      autoPublish: clinic.reviewConfig?.autoPublish ?? false,
    },
  };

  return `export const clinicConfig = ${JSON.stringify(configObject, null, 2)} as const;\n`;
}

async function pollRepoReady(
  owner: string,
  repo: string,
  maxRetries: number = 3,
  delayMs: number = 5000,
): Promise<void> {
  const octokit = getOctokit();
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      await octokit.repos.get({ owner, repo });
      return;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  throw lastError || new Error("Failed to verify repo after creation");
}

export async function githubProvisionStep(
  clinicId: string,
): Promise<{ repoUrl: string }> {
  const db = getDb();
  const octokit = getOctokit();
  const owner = templateOwner();

  const clinic = await db.query.clinics.findFirst({
    where: eq(schema.clinics.id, clinicId),
  });
  if (!clinic) throw new Error(`Clinic not found: ${clinicId}`);

  const repoName = `dreamcreate-${clinic.slug}`;

  const response = await octokit.rest.repos.createUsingTemplate({
    template_owner: owner,
    template_repo: templateRepo(),
    owner,
    name: repoName,
    private: true,
    include_all_branches: false,
  });

  const repoUrl = response.data.html_url;

  if (!repoUrl) throw new Error("Failed to get repo URL from GitHub response");

  await pollRepoReady(owner, repoName);

  const clinicConfig = generateClinicConfig(clinic);
  const base64Content = Buffer.from(clinicConfig).toString("base64");

  await octokit.rest.repos.createOrUpdateFileContents({
    owner,
    repo: repoName,
    path: "config/clinic.ts",
    message: `chore: initialize clinic config for ${clinic.name}`,
    content: base64Content,
  });

  return { repoUrl };
}
