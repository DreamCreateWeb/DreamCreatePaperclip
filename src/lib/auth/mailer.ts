import { normalizeEmail } from "./admins";

export type LoginEmail = {
  to: string;
  url: string;
};

export type OwnerLoginEmail = LoginEmail & {
  clinicName: string;
};

export type OnboardingResumeEmail = {
  to: string;
  url: string;
};

export interface Mailer {
  sendLoginLink(email: LoginEmail): Promise<void>;
  sendOwnerLoginLink(email: OwnerLoginEmail): Promise<void>;
  sendOnboardingResumeLink(email: OnboardingResumeEmail): Promise<void>;
}

export class ConsoleMailer implements Mailer {
  async sendLoginLink(email: LoginEmail): Promise<void> {
    const banner = "===== Dream Create admin magic link =====";
    console.log(`\n${banner}`);
    console.log(`To:   ${normalizeEmail(email.to)}`);
    console.log(`Link: ${email.url}`);
    console.log(`${"=".repeat(banner.length)}\n`);
  }

  async sendOwnerLoginLink(email: OwnerLoginEmail): Promise<void> {
    const banner = `===== ${email.clinicName} portal magic link =====`;
    console.log(`\n${banner}`);
    console.log(`To:   ${normalizeEmail(email.to)}`);
    console.log(`Link: ${email.url}`);
    console.log(`${"=".repeat(banner.length)}\n`);
  }

  async sendOnboardingResumeLink(email: OnboardingResumeEmail): Promise<void> {
    const banner = "===== Dream Create onboarding resume link =====";
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

  private async send(payload: {
    to: string;
    subject: string;
    text: string;
    html: string;
  }): Promise<void> {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: this.from,
        to: normalizeEmail(payload.to),
        subject: payload.subject,
        text: payload.text,
        html: payload.html,
      }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "<no body>");
      throw new Error(`Resend send failed: ${res.status} ${detail}`);
    }
  }

  async sendLoginLink({ to, url }: LoginEmail): Promise<void> {
    await this.send({
      to,
      subject: "Your Dream Create admin sign-in link",
      text: `Sign in to Dream Create admin:\n\n${url}\n\nThis link expires in 15 minutes. If you didn't request it, ignore this email.`,
      html: `<p>Sign in to Dream Create admin:</p><p><a href="${url}">${url}</a></p><p style="color:#666">This link expires in 15 minutes. If you didn't request it, ignore this email.</p>`,
    });
  }

  async sendOwnerLoginLink({
    to,
    url,
    clinicName,
  }: OwnerLoginEmail): Promise<void> {
    await this.send({
      to,
      subject: `Sign in to ${clinicName}`,
      text: `Sign in to your ${clinicName} owner portal:\n\n${url}\n\nThis link expires in 15 minutes. If you didn't request it, ignore this email.`,
      html: `<p>Sign in to your <strong>${clinicName}</strong> owner portal:</p><p><a href="${url}">${url}</a></p><p style="color:#666">This link expires in 15 minutes. If you didn't request it, ignore this email.</p>`,
    });
  }

  async sendOnboardingResumeLink({ to, url }: OnboardingResumeEmail): Promise<void> {
    await this.send({
      to,
      subject: "Resume your Dream Create onboarding",
      text: `You left your clinic onboarding form in progress. Pick up where you left off:\n\n${url}\n\nThis link expires in 24 hours. If you didn't start an onboarding form, you can ignore this email.`,
      html: `<p>You left your clinic onboarding form in progress. Pick up where you left off:</p><p><a href="${url}">${url}</a></p><p style="color:#666">This link expires in 24 hours. If you didn't start an onboarding form, you can ignore this email.</p>`,
    });
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
