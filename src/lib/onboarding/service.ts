import { eq } from "drizzle-orm";

import { getDb } from "@/src/db/client";
import {
  auditEvents,
  clinics,
  onboardingSubmissions,
  type ClinicAddress,
  type ClinicBrand,
  type ClinicHours,
  type ClinicService,
  type ClinicSocial,
  type ClinicTeamMember,
} from "@/src/db/schema";

import type { OnboardingPayload } from "./schema";

const SLUG_MAX_LEN = 40;

export function slugifyName(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, SLUG_MAX_LEN)
    .replace(/-+$/g, "");
}

async function findUniqueSlug(base: string): Promise<string> {
  const db = getDb();
  const candidate = base || "clinic";
  const existing = await db
    .select({ slug: clinics.slug })
    .from(clinics)
    .where(eq(clinics.slug, candidate))
    .limit(1);
  if (existing.length === 0) return candidate;

  for (let i = 2; i < 1000; i += 1) {
    const suffix = `-${i}`;
    const next =
      candidate.length + suffix.length <= SLUG_MAX_LEN
        ? `${candidate}${suffix}`
        : `${candidate.slice(0, SLUG_MAX_LEN - suffix.length)}${suffix}`;
    const conflict = await db
      .select({ slug: clinics.slug })
      .from(clinics)
      .where(eq(clinics.slug, next))
      .limit(1);
    if (conflict.length === 0) return next;
  }
  throw new Error("Could not allocate a unique slug");
}

export type CreateOnboardingResult = {
  clinicId: string;
  slug: string;
  submissionId: string;
};

export async function createOnboardingSubmission(
  payload: OnboardingPayload,
  meta: { ip: string | null; userAgent: string | null },
): Promise<CreateOnboardingResult> {
  const db = getDb();
  const baseSlug = payload.slug ?? slugifyName(payload.name);
  const slug = await findUniqueSlug(baseSlug);

  const address: ClinicAddress = {
    line1: payload.address.line1,
    line2: payload.address.line2,
    city: payload.address.city,
    state: payload.address.state,
    postalCode: payload.address.postalCode,
  };

  const brand: ClinicBrand = {
    primaryColor: payload.brand.primaryColor,
    accentColor: payload.brand.accentColor,
    logoUrl: payload.brand.logoUrl,
    template: payload.brand.template ?? "warm",
  };

  const services: ClinicService[] = payload.services.map((s) => ({
    name: s.name,
    description: s.description,
  }));

  const team: ClinicTeamMember[] = payload.team.map((t) => ({
    name: t.name,
    role: t.role,
    bio: t.bio,
    photoUrl: t.photoUrl,
  }));

  const hours: ClinicHours | undefined = payload.hours?.map((h) => ({
    day: h.day,
    closed: h.closed,
    open: h.open,
    close: h.close,
  }));

  const social: ClinicSocial | undefined = payload.social
    ? {
        website: payload.social.website,
        facebook: payload.social.facebook,
        instagram: payload.social.instagram,
        google: payload.social.google,
      }
    : undefined;

  return await db.transaction(async (tx) => {
    const [clinic] = await tx
      .insert(clinics)
      .values({
        slug,
        name: payload.name,
        contactEmail: payload.contactEmail,
        contactPhone: payload.contactPhone,
        address,
        brand,
        services,
        team,
        hours,
        social,
        status: "draft",
      })
      .returning({ id: clinics.id });

    const [submission] = await tx
      .insert(onboardingSubmissions)
      .values({
        clinicId: clinic.id,
        payload: {
          ...payload,
          // Replay-friendly metadata; never echoed to the public site.
          _meta: { ip: meta.ip, userAgent: meta.userAgent },
        },
      })
      .returning({ id: onboardingSubmissions.id });

    await tx.insert(auditEvents).values({
      actor: "public",
      action: "onboarding.submitted",
      entityType: "clinic",
      entityId: clinic.id,
      payload: {
        submissionId: submission.id,
        slug,
        ip: meta.ip,
      },
    });

    return { clinicId: clinic.id, slug, submissionId: submission.id };
  });
}
