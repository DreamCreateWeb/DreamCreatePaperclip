import { NextResponse } from "next/server";

import { normalizeEmail } from "@/src/lib/auth/admins";
import { getMailer } from "@/src/lib/auth/mailer";
import {
  findOrBootstrapOwnerByEmail,
  issueOwnerLoginToken,
} from "@/src/lib/owner-auth/sessions";

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

  const owner = await findOrBootstrapOwnerByEmail(email);
  if (owner) {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
    const { token } = await issueOwnerLoginToken(email, ip);
    const url = `${getAppUrl(req)}/api/owner/auth/callback?token=${encodeURIComponent(
      token,
    )}`;
    try {
      await getMailer().sendOwnerLoginLink({
        to: email,
        url,
        clinicName: owner.clinic.name,
      });
    } catch (err) {
      console.error("[owner/auth/request] mailer failed", err);
      return NextResponse.json(
        { error: "could not send link" },
        { status: 500 },
      );
    }
  }
  // Identical response either way so we don't leak which emails are owners.
  if (contentType.includes("application/json")) {
    return NextResponse.json({ ok: true });
  }
  return NextResponse.redirect(new URL("/portal/login/check-email", req.url), 303);
}
