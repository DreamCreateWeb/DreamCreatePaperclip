import { NextResponse } from "next/server";
import { put } from "@vercel/blob";

import { clientIp, rateLimit } from "@/src/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/svg+xml", "image/webp"];
// 20 uploads per hour per IP — generous for a form but still bounded
const RATE_LIMIT_PER_HOUR = 20;
const RATE_LIMIT_WINDOW_SECONDS = 60 * 60;

export async function POST(req: Request) {
  const ip = clientIp(req);
  const gate = rateLimit(
    `onboard-upload:${ip ?? "anon"}`,
    RATE_LIMIT_PER_HOUR,
    RATE_LIMIT_WINDOW_SECONDS,
  );
  if (!gate.ok) {
    return NextResponse.json(
      { ok: false, error: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(gate.retryAfterSeconds) } },
    );
  }

  const formData = await req.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "missing_file" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ ok: false, error: "invalid_file_type" }, { status: 422 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ ok: false, error: "file_too_large" }, { status: 422 });
  }

  const ext = file.name.split(".").pop() ?? "bin";
  const blob = await put(`onboard-logos/${Date.now()}.${ext}`, file, {
    access: "public",
    contentType: file.type,
  });

  return NextResponse.json({ ok: true, logoUrl: blob.url });
}
