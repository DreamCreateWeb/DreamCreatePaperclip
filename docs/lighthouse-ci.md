# Lighthouse CI Gate

## What it does

Every PR that touches the clinic template (under `app/sites/`, `src/components/`, `app/globals.css`, `app/layout.tsx`) runs Lighthouse against the Vercel preview deployment and enforces these score budgets:

| Category       | Minimum |
| -------------- | ------- |
| Performance    | 90      |
| Accessibility  | 95      |
| Best Practices | 90      |
| SEO            | 95      |

A failing budget blocks merge. Score deltas vs the uploaded baseline appear as a PR comment (requires `LHCI_GITHUB_APP_TOKEN` secret).

## Enabling the required check (one-time GitHub setup)

1. Go to **Settings → Branches** in the GitHub repo.
2. Add (or edit) the branch protection rule for `main`.
3. Enable **Require status checks to pass before merging**.
4. Search for and add the check named **`lighthouse`** (matches the job name in `.github/workflows/lighthouse.yml`).
5. Save changes.

## Escape hatch — one-off exceptions

If a PR genuinely cannot meet a budget threshold (e.g., a third-party embed temporarily hurts performance and a fix is tracked separately), a maintainer can bypass the gate by:

1. Adding the **`skip-lighthouse`** label to the PR.
2. Leaving a PR comment explaining why the bypass is needed and linking the follow-up issue.

The `skip-lighthouse` label must be removed before the PR can set a new baseline.

## Secrets required

| Secret                | Purpose                                             |
| --------------------- | --------------------------------------------------- |
| `GH_TOKEN`            | Wait-for-Vercel-preview action; read-only repo PAT  |
| `LHCI_GITHUB_APP_TOKEN` | Posts score-delta comment on the PR               |

## Local testing

```bash
# Install LHCI globally once
npm install -g @lhci/cli

# Start the dev server in one terminal
npm run dev

# In another terminal, audit the clinic pages
LHCI_CLINIC_SLUG=smile-bright-rogers lhci autorun
```
