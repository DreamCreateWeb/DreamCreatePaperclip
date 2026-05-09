import type {
  ResponseCookie,
  ResponseCookies,
} from "next/dist/compiled/@edge-runtime/cookies";

import {
  encodeSessionCookie,
  type SessionCookiePayload,
} from "@/src/lib/auth/crypto";

import {
  OWNER_SESSION_COOKIE_NAME,
  OWNER_SESSION_TTL_SECONDS,
} from "./sessions";

type WritableCookies = Pick<ResponseCookies, "set" | "delete">;

function baseCookieOptions(): Omit<ResponseCookie, "name" | "value"> {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  };
}

export async function setOwnerSessionCookie(
  cookies: WritableCookies,
  sessionId: string,
  token: string,
  expiresAt: Date,
): Promise<void> {
  const payload: SessionCookiePayload = {
    sid: sessionId,
    tok: token,
    exp: Math.floor(expiresAt.getTime() / 1000),
  };
  const value = await encodeSessionCookie(payload);
  cookies.set({
    ...baseCookieOptions(),
    name: OWNER_SESSION_COOKIE_NAME,
    value,
    expires: expiresAt,
    maxAge: OWNER_SESSION_TTL_SECONDS,
  });
}

export function clearOwnerSessionCookie(cookies: WritableCookies): void {
  cookies.set({
    ...baseCookieOptions(),
    name: OWNER_SESSION_COOKIE_NAME,
    value: "",
    expires: new Date(0),
    maxAge: 0,
  });
}
