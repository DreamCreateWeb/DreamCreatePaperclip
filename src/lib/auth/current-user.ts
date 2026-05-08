import { cookies } from "next/headers";

import type { AdminUser } from "@/src/db/schema";

import { decodeSessionCookie } from "./crypto";
import { SESSION_COOKIE_NAME, loadSession } from "./sessions";

export async function getCurrentAdminUser(): Promise<AdminUser | null> {
  const store = await cookies();
  const raw = store.get(SESSION_COOKIE_NAME)?.value;
  if (!raw) return null;
  const payload = await decodeSessionCookie(raw);
  if (!payload) return null;
  const session = await loadSession(payload.sid, payload.tok);
  return session?.user ?? null;
}
