import type { Appointment, Clinic } from "@/src/db/schema";

import { formatBookingTime } from "./format";

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
    process.env.BOOKING_EMAIL_FROM ?? process.env.ADMIN_LOGIN_EMAIL_FROM;

  if (!apiKey || !from) {
    const banner = "===== Dream Create booking email =====";
    console.log(`\n${banner}`);
    console.log(`To:      ${payload.to}`);
    console.log(`Subject: ${payload.subject}`);
    if (payload.replyTo) console.log(`Reply-To: ${payload.replyTo}`);
    console.log(payload.text);
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

export async function sendBookingNotifications(
  clinic: Pick<Clinic, "name" | "contactEmail" | "bookingConfig">,
  appointment: Appointment,
): Promise<void> {
  const time = formatBookingTime(appointment, clinic);

  const patientText = [
    `Hi ${appointment.patientName},`,
    "",
    `Your appointment request is in. We'll reach out shortly to confirm.`,
    "",
    `Clinic:  ${clinic.name}`,
    `Service: ${appointment.serviceName}`,
    `When:    ${time}`,
    appointment.notes ? `Notes:   ${appointment.notes}` : "",
    "",
    `If you need to make changes, just reply to this email.`,
  ]
    .filter(Boolean)
    .join("\n");

  const patientHtml = `
    <p>Hi ${escapeHtml(appointment.patientName)},</p>
    <p>Your appointment request is in. We'll reach out shortly to confirm.</p>
    <table cellpadding="6" style="border-collapse:collapse;font-family:Helvetica,Arial,sans-serif;">
      <tr><td><strong>Clinic</strong></td><td>${escapeHtml(clinic.name)}</td></tr>
      <tr><td><strong>Service</strong></td><td>${escapeHtml(appointment.serviceName)}</td></tr>
      <tr><td><strong>When</strong></td><td>${escapeHtml(time)}</td></tr>
      ${
        appointment.notes
          ? `<tr><td><strong>Notes</strong></td><td>${escapeHtml(appointment.notes)}</td></tr>`
          : ""
      }
    </table>
    <p style="color:#666;font-size:13px;">Need to make changes? Just reply to this email.</p>
  `;

  const clinicText = [
    `New booking request for ${clinic.name}.`,
    "",
    `Patient: ${appointment.patientName}`,
    `Email:   ${appointment.patientEmail}`,
    appointment.patientPhone ? `Phone:   ${appointment.patientPhone}` : "",
    `Service: ${appointment.serviceName}`,
    `When:    ${time}`,
    appointment.notes ? `Notes:   ${appointment.notes}` : "",
    "",
    `Manage in your portal: /portal/bookings`,
  ]
    .filter(Boolean)
    .join("\n");

  const clinicHtml = `
    <p>New booking request for <strong>${escapeHtml(clinic.name)}</strong>.</p>
    <table cellpadding="6" style="border-collapse:collapse;font-family:Helvetica,Arial,sans-serif;">
      <tr><td><strong>Patient</strong></td><td>${escapeHtml(appointment.patientName)}</td></tr>
      <tr><td><strong>Email</strong></td><td>${escapeHtml(appointment.patientEmail)}</td></tr>
      ${
        appointment.patientPhone
          ? `<tr><td><strong>Phone</strong></td><td>${escapeHtml(appointment.patientPhone)}</td></tr>`
          : ""
      }
      <tr><td><strong>Service</strong></td><td>${escapeHtml(appointment.serviceName)}</td></tr>
      <tr><td><strong>When</strong></td><td>${escapeHtml(time)}</td></tr>
      ${
        appointment.notes
          ? `<tr><td><strong>Notes</strong></td><td>${escapeHtml(appointment.notes)}</td></tr>`
          : ""
      }
    </table>
    <p><a href="/portal/bookings">Manage in your portal →</a></p>
  `;

  // Patient confirmation
  await sendEmail({
    to: appointment.patientEmail,
    subject: `Booking received — ${clinic.name}`,
    text: patientText,
    html: patientHtml,
    replyTo: clinic.contactEmail,
  });

  // Clinic notification
  await sendEmail({
    to: clinic.contactEmail,
    subject: `New booking · ${appointment.patientName} · ${appointment.serviceName}`,
    text: clinicText,
    html: clinicHtml,
    replyTo: appointment.patientEmail,
  });
}

export async function sendBookingStatusEmail(
  clinic: Pick<Clinic, "name" | "contactEmail" | "bookingConfig">,
  appointment: Appointment,
): Promise<void> {
  const time = formatBookingTime(appointment, clinic);
  let subject: string;
  let opening: string;
  let body: string;
  switch (appointment.status) {
    case "confirmed":
      subject = `Confirmed — your appointment at ${clinic.name}`;
      opening = "Your appointment is confirmed.";
      body = `We'll see you on ${time}.`;
      break;
    case "cancelled":
      subject = `Cancelled — your appointment at ${clinic.name}`;
      opening = "Your appointment has been cancelled.";
      body = `If this was unexpected, reply to this email and we'll reach out.`;
      break;
    case "completed":
      subject = `Thanks for visiting ${clinic.name}`;
      opening = "Thanks for coming in.";
      body = `We hope to see you again. If we can do better, reply to this email.`;
      break;
    default:
      return;
  }
  const text = [
    `Hi ${appointment.patientName},`,
    "",
    opening,
    "",
    `Service: ${appointment.serviceName}`,
    `When:    ${time}`,
    "",
    body,
  ].join("\n");
  const html = `
    <p>Hi ${escapeHtml(appointment.patientName)},</p>
    <p><strong>${escapeHtml(opening)}</strong></p>
    <table cellpadding="6" style="border-collapse:collapse;font-family:Helvetica,Arial,sans-serif;">
      <tr><td><strong>Service</strong></td><td>${escapeHtml(appointment.serviceName)}</td></tr>
      <tr><td><strong>When</strong></td><td>${escapeHtml(time)}</td></tr>
    </table>
    <p style="color:#666;font-size:13px;">${escapeHtml(body)}</p>
  `;
  await sendEmail({
    to: appointment.patientEmail,
    subject,
    text,
    html,
    replyTo: clinic.contactEmail,
  });
}
