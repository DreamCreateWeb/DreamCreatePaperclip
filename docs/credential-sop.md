# Credential SOP — Lookup, Reset, Notify

**Owner:** AccountManager  
**Last updated:** 2026-05-10  
**Covers:** DRE-49

---

## Overview

This SOP is the canonical workflow any Dream Create agent triggers when they need credentials for a service, or when existing credentials are stale/missing.

---

## Trigger

Any agent that needs a credential calls:

```bash
node vault/vault.js read <service_name>
```

If the entry is found and current, the credential is returned and the workflow ends. If missing or expired, proceed to the Reset workflow.

---

## Security Tier Password Rules

| Tier | Services | Password |
|------|----------|----------|
| `sensitive` | Financial (Stripe, QuickBooks), legal, PII-bearing | `Silver.Mouth(00)` variant (append year: `Silver.Mouth(26)`) |
| `standard` | Regular SaaS (Vercel, GitHub, Namecheap, etc.) | `Potatoes24!` |
| `throwaway` | Free trials, low-value, no PII | `Potatoes24` |

---

## Workflow

### Step 1 — Lookup

```bash
node vault/vault.js read <service_name>
```

- **Found and current** → return credential to requesting agent, log the read, stop.
- **Missing or `last_rotated` > 90 days ago** → proceed to Step 2.

---

### Step 2 — Reset via Portal

1. Open the service's login/forgot-password page via Playwright MCP (Chrome).
2. Trigger "Forgot password" with the username on file (`dustin@dreamcreateweb.com` unless service-specific).
3. Read the reset email from Gmail:
   ```
   search_threads query: "password reset" newer_than:5m
   ```
4. Click the reset link from the email.
5. Generate new password using the tier rule above.
6. Apply the new password on the portal.
7. Proceed to Step 3.

---

### Step 3 — Store in Vault

```bash
node vault/vault.js write '{
  "service_name": "<service>",
  "username": "<email>",
  "password": "<new_password>",
  "format": "<standard|sensitive|throwaway>",
  "security_tier": "<standard|sensitive|throwaway>",
  "last_rotated": "<ISO timestamp>"
}'
```

Verify with:

```bash
node vault/vault.js read <service_name>
```

---

### Step 4 — Notify Dustin

Send **both** a Slack DM and an email. Both are required.

**Slack DM** (channel `D0B3HFJ5PG8`):
```
[Credential Updated] <service>: <username> | <format-name> | <timestamp>
```

**Email** to `dustin@dreamcreateweb.com` subject:
```
[Credential Updated] <service>: <username> | <format-name> | <timestamp>
```

---

### Step 5 — Archive Reset Email

Apply Gmail label `Paperclip/Credentials` to the reset confirmation email (create label if it doesn't exist). Archive it (remove from Inbox).

---

## 2FA Handling

| 2FA Type | Action |
|----------|--------|
| Email-OTP | Handle automatically: read OTP from Gmail, submit. |
| TOTP (agent-accessible secret in vault) | Fetch `mfa_secret_ref` from vault, compute TOTP, submit. |
| TOTP (no agent-accessible secret) | Email Dustin: `[2FA Request] <service>: need code, please reply with code from your authenticator. Will reset MFA to agent-accessible after this run.` Wait for reply, submit. |
| SMS-only MFA | **Escalate to CEO.** We cannot receive SMS. Mark portal as `blocked-on-MFA` in vault notes. |

---

## Escalation Triggers

Stop and create a Paperclip issue assigned to CEO for any of the following:

- SMS-only MFA on any account
- Hard 2FA on a shared/financial account with no bypass
- Any Stripe/financial portal password reset (sensitive tier) — CEO awareness required before proceeding
- Any portal that locks the account after failed attempts
- Reset link not received after 10 minutes
- New password rejected by portal (complexity requirement unknown)

---

## Notification Template (canonical, do not alter)

```
[Credential Updated] {service}: {username} | {format-name} | {timestamp}
```

Keep this template stable so automated audit grep works:
```bash
grep "\[Credential Updated\]" audit.log
```

---

## Vault Audit Log

All reads and writes are recorded in:
```
/paperclip/instances/default/companies/<company-id>/vault/audit.log
```

---

## Dry-Run Record

| Date | Service | Outcome | Notes |
|------|---------|---------|-------|
| 2026-05-10 | *(pending — see DRE-49 acceptance criteria)* | — | First dry-run to be executed on a low-stakes free-trial SaaS |
