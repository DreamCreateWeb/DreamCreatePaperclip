import { NextResponse } from "next/server";

import { isAllowedAdmin, normalizeEmail } from "@/src/lib/auth/admins";
import { getMailer } from "@/src/lib/auth/mailer";
import { issueLoginToken } from "@/src/lib/auth/sessions";

export const runtime = "nodejs";

function getAppUrl(req: Request): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL;
  if (fromEnv) return fromEnv.replace(/\/+$/, "");
  return new URL(req.url).origin;
}

export async function POST(req: Request) {
  let email: string;
  const contentType = req.headers.get("content-type") ?? "";
  try {
    if (contentType.includes("application/json")) {
      const body = (await req.json()) as { email?: unknown };
      if (typeof body.email !== "string") {
        return NextResponse.json({ error: "email required" }, { status: 400 });
      }
      email = normalizeEmail(body.email);
    } else {
      const form = await req.formData();
      const value = form.get("email");
      if (typeof value !== "string") {
        return NextResponse.json({ error: "email required" }, { status: 400 });
      }
      email = normalizeEmail(value);
    }
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  if (!email.includes("@")) {
    return NextResponse.json({ error: "invalid email" }, { status: 400 });
  }

  if (isAllowedAdmin(email)) {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
    const { token } = await issueLoginToken(email, ip);
    const url = `${getAppUrl(req)}/api/admin/auth/callback?token=${encodeURIComponent(
      token,
    )}`;
    try {
      await getMailer().sendLoginLink({ to: email, url });
    } catch (err) {
      console.error("[admin/auth/request] mailer failed", err);
      return NextResponse.json(
        { error: "could not send link" },
        { status: 500 },
      );
    }
  }
  // Always respond identically so we don't leak which emails are on the list.
  if (contentType.includes("application/json")) {
    return NextResponse.json({ ok: true });
  }
  return NextResponse.redirect(new URL("/login/check-email", req.url), 303);
}
