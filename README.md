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
- **Schema**: [`src/db/schema.ts`](./src/db/schema.ts) — `clinics`, `onboarding_submissions`, `provisioning_runs`, `audit_events`, `admin_users`, `admin_login_tokens`, `admin_sessions`.
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

## Environment

See [`.env.example`](./.env.example) for the full list of variables this platform expects. Secrets are stored in Railway and Vercel — never commit a real `.env`.

## Deployment

Vercel project is linked to `DreamCreateWeb/DreamCreatePaperclip`. `main` deploys to production. Preview deploys are created automatically for PRs.

## Project status

Roadmap and phase breakdown live on [DRE-15](/DRE/issues/DRE-15). This repo currently covers Phase 0 — foundation.
