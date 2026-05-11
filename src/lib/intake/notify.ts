import type { Clinic, IntakeSubmission } from "@/src/db/schema";

type SendArgs = {
  to: string;
  subject: string;
  text: string;
  html: string;
  replyTo?: string;
};

async function sendEmail(payload: SendArgs): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from =
    process.env.INTAKE_EMAIL_FROM ?? process.env.ADMIN_LOGIN_EMAIL_FROM;

  // SECURITY: In dev/test mode, log email for inspection but redact patient PHI.
  if (!apiKey || !from) {
    const banner = "===== Dream Create intake email =====";
    console.log(`\n${banner}`);
    console.log(`To:      ${payload.to}`);
    console.log(`Subject: ${payload.subject}`);
    if (payload.replyTo) console.log(`Reply-To: ${payload.replyTo}`);
    // Log redacted text: replace patient name and email with placeholders to avoid logging PHI
    const redactedText = payload.text.replace(
      /Patient: .*$/m,
      "Patient: [REDACTED]",
    );
    console.log(redactedText);
    console.log(`${"=".repeat(banner.length)}\n`);
    return;
  }

  const body: Record<string, unknown> = {
    from,
    to: payload.to,
    subject: payload.subject,
    text: payload.text,
    html: payload.html,
  };
  if (payload.replyTo) body.reply_to = payload.replyTo;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "<no body>");
    throw new Error(`Resend send failed: ${res.status} ${detail}`);
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function notifyOwnerNewIntakeSubmission(
  clinic: Pick<Clinic, "name" | "contactEmail">,
  submission: IntakeSubmission,
): Promise<void> {
  // SECURITY: This function receives decrypted PHI (patient name, email, DOB, phone).
  // Patient data MUST appear only in the final email body sent to clinic owner.
  // Do NOT log patient name/email/DOB/phone in console, error messages, or headers.
  const text = [
    `New patient intake form submitted for ${clinic.name}.`,
    "",
    `Patient: ${submission.patientName}`,
    `Submission ID: ${submission.id}`,
    "",
    `Review in your portal: /portal/intake`,
  ].join("\n");

  const html = `
    <p>New patient intake form submitted for <strong>${escapeHtml(clinic.name)}</strong>.</p>
    <table cellpadding="6" style="border-collapse:collapse;font-family:Helvetica,Arial,sans-serif;">
      <tr><td><strong>Patient</strong></td><td>${escapeHtml(submission.patientName)}</td></tr>
      <tr><td><strong>Submission ID</strong></td><td><code>${escapeHtml(submission.id)}</code></td></tr>
    </table>
    <p><a href="/portal/intake">Review in your portal →</a></p>
  `;

  await sendEmail({
    to: clinic.contactEmail,
    subject: "New patient intake form submitted",
    text,
    html,
  });
}
