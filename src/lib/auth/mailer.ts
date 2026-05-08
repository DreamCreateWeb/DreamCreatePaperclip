import { normalizeEmail } from "./admins";

export type LoginEmail = {
  to: string;
  url: string;
};

export interface Mailer {
  sendLoginLink(email: LoginEmail): Promise<void>;
}

export class ConsoleMailer implements Mailer {
  async sendLoginLink(email: LoginEmail): Promise<void> {
    const banner = "===== Dream Create admin magic link =====";
    console.log(`\n${banner}`);
    console.log(`To:   ${normalizeEmail(email.to)}`);
    console.log(`Link: ${email.url}`);
    console.log(`${"=".repeat(banner.length)}\n`);
  }
}

class ResendMailer implements Mailer {
  constructor(
    private readonly apiKey: string,
    private readonly from: string,
  ) {}

  async sendLoginLink({ to, url }: LoginEmail): Promise<void> {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: this.from,
        to: normalizeEmail(to),
        subject: "Your Dream Create admin sign-in link",
        text: `Sign in to Dream Create admin:\n\n${url}\n\nThis link expires in 15 minutes. If you didn't request it, ignore this email.`,
        html: `<p>Sign in to Dream Create admin:</p><p><a href="${url}">${url}</a></p><p style="color:#666">This link expires in 15 minutes. If you didn't request it, ignore this email.</p>`,
      }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "<no body>");
      throw new Error(`Resend send failed: ${res.status} ${detail}`);
    }
  }
}

export function getMailer(): Mailer {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.ADMIN_LOGIN_EMAIL_FROM;
  if (apiKey && from) {
    return new ResendMailer(apiKey, from);
  }
  return new ConsoleMailer();
}
