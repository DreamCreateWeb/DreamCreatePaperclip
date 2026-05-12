# Dream Create Paperclip

Dream Create platform — admin, billing, and provisioning for the $200/mo dental clinic factory.

A board user collects a clinic intake → the clinic pays $200 via Stripe Checkout → a webhook fires → this platform clones the master template, writes the clinic config, creates a Vercel project, deploys, and registers the live URL. Subsequent edits flow through the same admin console.

## Stack

- Next.js 15 (App Router) with TypeScript strict mode
- Tailwind CSS v4 (CSS-first config via `@theme`)
- Drizzle ORM + Railway Postgres (added in Phase 0 / DRE-17)
- Stripe (Products, Prices, Checkout, webhooks)
- GitHub API (Octokit) for template instantiation
- Vercel API for project create + deploy
- Hosted on Vercel

## Routes

| Path                          | Purpose                                       |
| ----------------------------- | --------------------------------------------- |
| `/`                           | Public marketing landing                      |
| `/onboard`                    | Public clinic onboarding intake (DRE-20)      |
| `/login`                      | Operator sign-in (magic link request)         |
| `/login/check-email`          | Generic post-request confirmation             |
| `/admin`                      | Admin console (gated)                         |
| `/api/health`                 | Liveness check — returns 200 JSON             |
| `/api/admin/auth/request`     | POST — issues a magic link if email allowed   |
| `/api/admin/auth/callback`    | GET — consumes a magic link, sets session     |
| `/api/admin/auth/logout`      | POST/GET — revokes session, clears cookie     |
| `/sites/[slug]`               | Patient-facing clinic homepage (DRE-23)       |
| `/sites/[slug]/services`      | Clinic services page (DRE-23)                 |
| `/sites/[slug]/team`          | Clinic team/about page (DRE-23)               |
| `/sites/[slug]/contact`       | Clinic contact page (form + map + hours)      |
| `/api/clinic/[slug]/contact`  | POST — public contact form intake             |

## Local development

```bash
cp .env.example .env
npm install
docker compose up -d postgres   # local Postgres (or set DATABASE_URL to Railway)
npm run db:migrate              # apply migrations to a fresh DB
npm run db:seed                 # insert one fake clinic in `draft`
npm run dev
```

Open http://localhost:3000. The health check is at http://localhost:3000/api/health.

When you don't have Docker, point `DATABASE_URL` at any reachable Postgres 16 instance (Railway, Neon, etc.) and run the same migrate/seed sequence.

## Scripts

| Script               | Purpose                                                              |
| -------------------- | -------------------------------------------------------------------- |
| `npm run dev`        | Start the Next.js dev server                                         |
| `npm run build`      | Production build                                                     |
| `npm run start`      | Run the production build                                             |
| `npm run lint`       | ESLint over the project                                              |
| `npm run typecheck`  | TypeScript-only check (no emit)                                      |
| `npm run format`     | Prettier write across the repo                                       |
| `npm run db:generate`| Generate a new Drizzle migration from `src/db/schema.ts`             |
| `npm run db:migrate` | Apply pending migrations from `drizzle/` to `DATABASE_URL`           |
| `npm run db:seed`    | Insert one fake clinic in `draft` for local development              |
| `npm run db:studio`  | Open Drizzle Studio against `DATABASE_URL`                           |

## Database

- **ORM**: [Drizzle](https://orm.drizzle.team) over [postgres-js](https://github.com/porsager/postgres).
- **Schema**: [`src/db/schema.ts`](./src/db/schema.ts) — `clinics`, `clinic_contact_messages`, `onboarding_submissions`, `provisioning_runs`, `audit_events`, `admin_users`, `admin_login_tokens`, `admin_sessions`, `clinic_owner_users`, `clinic_owner_login_tokens`, `clinic_owner_sessions`.
- **Migrations**: checked into [`drizzle/`](./drizzle). Generate new ones with `npm run db:generate`; never edit existing migration files.
- **Local Postgres**: [`docker-compose.yml`](./docker-compose.yml) runs Postgres 16 on `localhost:5432` with credentials matching `.env.example`.
- **Production**: Railway Postgres. Set `DATABASE_URL` in Railway and Vercel; the same migrate command (`npm run db:migrate`) applies migrations on deploy.

## Admin auth

Magic-link auth, hand-rolled (no NextAuth dependency).

- **Allowlist**: `ADMIN_EMAILS` is a comma-separated list of operator emails. Anything outside the list silently 200s but never receives a link.
- **Session signing**: `ADMIN_SESSION_SECRET` (min 32 chars). Generate with `openssl rand -base64 48`.
- **Mailer**: if `RESEND_API_KEY` and `ADMIN_LOGIN_EMAIL_FROM` are set, links are sent via Resend. Otherwise, links print to the server console — fine for local dev.
- **Sessions**: 30-day TTL, stored hashed in `admin_sessions`. Cookie is `dc_admin_session`, HMAC-signed, httpOnly, lax, secure in prod.
- **Magic link tokens**: 15-minute TTL, single-use, stored hashed in `admin_login_tokens`.
- **Middleware**: [`middleware.ts`](./middleware.ts) gates `/admin/:path*`. Public surfaces (`/`, `/onboard`, `/api/health`, `/api/stripe/webhook`) stay open.

### Local sign-in (dev)

```bash
ADMIN_EMAILS=you@example.com \
ADMIN_SESSION_SECRET="$(openssl rand -base64 48)" \
npm run dev
```

1. Visit http://localhost:3000/login.
2. Enter your email — a link prints to the dev server console.
3. Click the link → you land on `/admin`.
4. Sign out from the admin header.

## Clinic owner portal

Each clinic gets an owner-side dashboard at `/portal` (separate from `/admin`).

- **Identity**: `clinic_owner_users.email` is unique. The first time someone requests a magic link with an email that matches `clinics.contact_email`, the owner row is created automatically and linked to that clinic — no admin invite needed for the seeded owner. After that, only emails in `clinic_owner_users` can sign in.
- **Cookie**: `dc_owner_session` (separate from admin), HMAC-signed with the same `ADMIN_SESSION_SECRET`.
- **Tables**: `clinic_owner_users`, `clinic_owner_login_tokens`, `clinic_owner_sessions`. Same 30-day session TTL, 15-minute token TTL as admin.
- **Mailer**: subject is "Sign in to {Clinic Name}". Uses Resend if configured, otherwise console.
- **Pages**: dashboard, contact-message inbox, site editor (basics / services / team / brand), settings.
- **Site editor sub-nav**: `/portal/site` (basics) → `/portal/site/services` → `/portal/site/team` → `/portal/site/brand`. Each section has its own PATCH endpoint under `/api/owner/clinic/*` and triggers `revalidatePath` for the public clinic site on save.
- **Brand editor**: live preview of header, primary button, and accent chips updates as colors change. Backed by `resolveBrand` so the preview matches what the public site renders.
- **Settings** (`/portal/settings`): change the public contact email, and "Sign out everywhere" which revokes all sessions for the owner and clears the local cookie.
- **Admin → owner invite**: admin page at `/admin/clinics` lists every clinic with its current owner. Admins can assign or replace the owner email, which sends a magic-link sign-in to the new address. Backed by `POST /api/admin/clinics/:clinicId/owner` with the same one-email-one-clinic uniqueness rule.

After running `npm run db:seed`, the seeded clinic at `smile-bright-rogers` has an owner `hello@smilebright.example` — request a magic link from `/portal/login` with that address and the link prints to the dev console.

## Environment

See [`.env.example`](./.env.example) for the full list of variables this platform expects. Secrets are stored in Railway and Vercel — never commit a real `.env`.

## Stripe billing

Live catalog (account `acct_1TUrAWQ59dAubGMS`):

| Item    | ID                                | Detail                                                                  |
| ------- | --------------------------------- | ----------------------------------------------------------------------- |
| Product | `prod_UTszokuJ2IUrVy`             | Dental Clinic Website (Dream Create)                                    |
| Price   | `price_1TUvDtQ59dAubGMSkrqRZevL`  | $200.00 USD / month, recurring — wired in `STRIPE_PRICE_CLINIC_MONTHLY` |

The legacy `$4,600/mo` Symmetry product (`prod_UTr5uTOttH0crf`) is archived and out of scope.

Set `STRIPE_PRICE_CLINIC_MONTHLY` to the live price ID in Railway and Vercel before Phase 2's Checkout flow can charge a clinic.

## Deployment

Vercel project is linked to `DreamCreateWeb/DreamCreatePaperclip`. `main` deploys to production. Preview deploys are created automatically for PRs.

## Google Drive integration

Server-side helper: `src/lib/google/drive.ts`

Exposes `listFolder(folderId)`, `getFile(fileId)`, and `downloadFile(fileId)` backed by the Dream Create service account.

**Service account email:** `paperclip@dreamcreate-agent-workspace.iam.gserviceaccount.com`

To give this app access to a Drive folder, share it with the SA email above (Viewer permission is sufficient for read-only access).

**Env var:** `GOOGLE_SERVICE_ACCOUNT_JSON` — the full SA key JSON as a single string (already set in Vercel for all environments). Do **not** commit this value to git.

This is the foundation for clinic logo/photo ingestion: clinics drop assets into a shared Drive folder; the platform reads them at provisioning time.

## Project status

Roadmap and phase breakdown live on [DRE-15](/DRE/issues/DRE-15). This repo currently covers Phase 0 — foundation.
