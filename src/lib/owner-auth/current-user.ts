import { cookies } from "next/headers";

import { decodeSessionCookie } from "@/src/lib/auth/crypto";

import {
  OWNER_SESSION_COOKIE_NAME,
  loadOwnerSession,
  type OwnerWithClinic,
} from "./sessions";

export async function getCurrentClinicOwner(): Promise<OwnerWithClinic | null> {
  const store = await cookies();
  const raw = store.get(OWNER_SESSION_COOKIE_NAME)?.value;
  if (!raw) return null;
  const payload = await decodeSessionCookie(raw);
  if (!payload) return null;
  return loadOwnerSession(payload.sid, payload.tok);
}
