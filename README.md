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

| Path           | Purpose                                          |
| -------------- | ------------------------------------------------ |
| `/`            | Admin landing (gated — auth lands in DRE-18)     |
| `/onboard`     | Public clinic onboarding intake (DRE-20)         |
| `/api/health`  | Liveness check — returns 200 JSON                |

## Local development

```bash
cp .env.example .env
npm install
npm run dev
```

Open http://localhost:3000. The health check is at http://localhost:3000/api/health.

## Scripts

| Script              | Purpose                            |
| ------------------- | ---------------------------------- |
| `npm run dev`       | Start the Next.js dev server       |
| `npm run build`     | Production build                   |
| `npm run start`     | Run the production build           |
| `npm run lint`      | ESLint over the project            |
| `npm run typecheck` | TypeScript-only check (no emit)    |
| `npm run format`    | Prettier write across the repo     |

## Environment

See [`.env.example`](./.env.example) for the full list of variables this platform expects. Secrets are stored in Railway and Vercel — never commit a real `.env`.

## Deployment

Vercel project is linked to `DreamCreateWeb/DreamCreatePaperclip`. `main` deploys to production. Preview deploys are created automatically for PRs.

## Project status

Roadmap and phase breakdown live on [DRE-15](/DRE/issues/DRE-15). This repo currently covers Phase 0 — foundation.
