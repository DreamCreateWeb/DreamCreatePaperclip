import { eq, lt } from "drizzle-orm";

import { getDb } from "@/src/db/client";
import { onboardingDrafts } from "@/src/db/schema";
import { randomToken, sha256Hex } from "@/src/lib/auth/crypto";
import { normalizeEmail } from "@/src/lib/auth/admins";

const LINK_TTL_MS = 24 * 60 * 60 * 1000;
const DATA_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const EMAIL_COOLDOWN_MS = 60 * 60 * 1000;

export type DraftFormState = Record<string, unknown>;

export type UpsertDraftResult = {
  token: string;
  emailAlreadySentRecently: boolean;
};

export async function upsertOnboardingDraft(
  email: string,
  payload: DraftFormState,
  lastStep: number,
): Promise<UpsertDraftResult> {
  const db = getDb();
  const normalizedEmail = normalizeEmail(email);

  const token = randomToken();
  const tokenHash = await sha256Hex(token);

  const now = new Date();
  const linkExpiresAt = new Date(now.getTime() + LINK_TTL_MS);
  const expiresAt = new Date(now.getTime() + DATA_TTL_MS);

  const existing = await db
    .select({ emailSentAt: onboardingDrafts.emailSentAt })
    .from(onboardingDrafts)
    .where(eq(onboardingDrafts.email, normalizedEmail))
    .limit(1);

  const lastSent = existing[0]?.emailSentAt;
  const emailAlreadySentRecently = !!(
    lastSent && now.getTime() - lastSent.getTime() < EMAIL_COOLDOWN_MS
  );

  const newEmailSentAt = emailAlreadySentRecently ? lastSent! : now;

  await db
    .insert(onboardingDrafts)
    .values({
      email: normalizedEmail,
      tokenHash,
      payload,
      lastStep,
      linkExpiresAt,
      expiresAt,
      emailSentAt: newEmailSentAt,
    })
    .onConflictDoUpdate({
      target: onboardingDrafts.email,
      set: {
        tokenHash,
        payload,
        lastStep,
        linkExpiresAt,
        expiresAt,
        emailSentAt: newEmailSentAt,
        updatedAt: now,
      },
    });

  return { token, emailAlreadySentRecently };
}

export type ResumeDraftResult = {
  payload: DraftFormState;
  lastStep: number;
} | null;

export async function getDraftByToken(rawToken: string): Promise<ResumeDraftResult> {
  const db = getDb();
  const tokenHash = await sha256Hex(rawToken);
  const now = new Date();

  const rows = await db
    .select({
      payload: onboardingDrafts.payload,
      lastStep: onboardingDrafts.lastStep,
      linkExpiresAt: onboardingDrafts.linkExpiresAt,
    })
    .from(onboardingDrafts)
    .where(eq(onboardingDrafts.tokenHash, tokenHash))
    .limit(1);

  const row = rows[0];
  if (!row) return null;
  if (row.linkExpiresAt < now) return null;

  return {
    payload: row.payload as DraftFormState,
    lastStep: row.lastStep,
  };
}

export async function deleteDraftByEmail(email: string): Promise<void> {
  const db = getDb();
  await db
    .delete(onboardingDrafts)
    .where(eq(onboardingDrafts.email, normalizeEmail(email)));
}

export async function pruneExpiredDrafts(): Promise<number> {
  const db = getDb();
  const deleted = await db
    .delete(onboardingDrafts)
    .where(lt(onboardingDrafts.expiresAt, new Date()))
    .returning({ id: onboardingDrafts.id });
  return deleted.length;
}
