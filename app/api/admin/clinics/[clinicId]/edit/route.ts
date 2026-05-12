import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { Octokit } from "@octokit/rest";
import { z } from "zod";

import { getDb, schema } from "@/src/db/client";
import { getCurrentAdminUser } from "@/src/lib/auth/current-user";
import { generateClinicConfig } from "@/src/lib/provisioning/github-step";
import { getRepoId } from "@/src/lib/provisioning/github";
import { triggerDeploy } from "@/src/lib/provisioning/vercel";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const editSchema = z.object({
  name: z.string().min(1).optional(),
  services: z
    .array(z.object({ name: z.string(), description: z.string().optional() }))
    .optional(),
  team: z
    .array(
      z.object({
        name: z.string(),
        role: z.string(),
        bio: z.string().optional(),
        photoUrl: z.string().optional(),
      }),
    )
    .optional(),
  brand: z
    .object({
      primaryColor: z.string().optional(),
      accentColor: z.string().optional(),
      template: z.enum(["warm", "modern", "ortho", "pediatric"]).optional(),
    })
    .optional(),
  hours: z
    .array(
      z.object({
        day: z.enum(["mon", "tue", "wed", "thu", "fri", "sat", "sun"]),
        closed: z.boolean(),
        open: z.string().optional(),
        close: z.string().optional(),
      }),
    )
    .optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ clinicId: string }> },
) {
  const admin = await getCurrentAdminUser();
  if (!admin) {
    return NextResponse.json(
      { ok: false, error: "unauthenticated" },
      { status: 401 },
    );
  }

  const { clinicId } = await params;
  const db = getDb();

  const clinic = await db.query.clinics.findFirst({
    where: eq(schema.clinics.id, clinicId),
  });

  if (!clinic) {
    return NextResponse.json(
      { ok: false, error: "clinic_not_found" },
      { status: 404 },
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = editSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "invalid_body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { name, services, team, brand, hours } = parsed.data;

  const updates: Partial<typeof schema.clinics.$inferInsert> = {
    updatedAt: new Date(),
  };
  if (name !== undefined) updates.name = name;
  if (services !== undefined) updates.services = services;
  if (team !== undefined) updates.team = team;
  if (hours !== undefined) updates.hours = hours;
  if (brand !== undefined) {
    updates.brand = {
      ...clinic.brand,
      ...brand,
    };
  }

  await db
    .update(schema.clinics)
    .set(updates)
    .where(eq(schema.clinics.id, clinicId));

  const updatedClinic = await db.query.clinics.findFirst({
    where: eq(schema.clinics.id, clinicId),
  });
  if (!updatedClinic) {
    return NextResponse.json({ ok: false, error: "clinic_not_found" }, { status: 404 });
  }

  if (!updatedClinic.repoUrl) {
    return NextResponse.json({ ok: true, deployed: false, reason: "no_repo" });
  }

  const githubToken = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
  if (!githubToken) {
    console.warn("[admin/clinics/edit] no GITHUB_TOKEN — skipping git commit");
    return NextResponse.json({ ok: true, deployed: false, reason: "no_github_token" });
  }

  const octokit = new Octokit({ auth: githubToken });
  const owner = process.env.GITHUB_TEMPLATE_OWNER ?? "DreamCreateWeb";
  const repoName = `dreamcreate-${updatedClinic.slug}`;
  const filePath = "config/clinic.ts";

  let fileSha: string | undefined;
  try {
    const { data } = await octokit.rest.repos.getContent({
      owner,
      repo: repoName,
      path: filePath,
    });
    if (!Array.isArray(data) && "sha" in data) fileSha = data.sha;
  } catch {
    // File may not exist yet — create it fresh
  }

  const newContent = generateClinicConfig(updatedClinic);
  const base64Content = Buffer.from(newContent).toString("base64");

  await octokit.rest.repos.createOrUpdateFileContents({
    owner,
    repo: repoName,
    path: filePath,
    message: `chore: update clinic config for ${updatedClinic.name}`,
    content: base64Content,
    ...(fileSha ? { sha: fileSha } : {}),
  });

  if (updatedClinic.vercelProjectId) {
    void (async () => {
      try {
        const repoId = await getRepoId(updatedClinic.slug);
        await triggerDeploy(updatedClinic.vercelProjectId!, repoId);
      } catch (err) {
        console.error("[admin/clinics/edit] Vercel redeploy failed (non-fatal)", err);
      }
    })();
  }

  return NextResponse.json({ ok: true, deployed: !!updatedClinic.vercelProjectId });
}
