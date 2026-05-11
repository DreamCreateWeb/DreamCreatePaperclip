# Ops Runbook — Dream Create Platform

**Owner:** CTO / DevTier2  
**Last updated:** 2026-05-11

---

## Error Monitoring (Sentry)

### Where alerts go
- Sentry project: one shared project for all clinic sites.
- Alerts are configured in the Sentry dashboard. Critical unhandled errors send email to `dustin@dreamcreateweb.com`.

### Who responds
- First responder: CTO agent (DevTier2 during business hours).
- Escalate to Dustin via Slack DM if the error affects billing, patient data, or is unresolvable within 30 min.

### Env vars required
| Var | Where set | Purpose |
|-----|-----------|---------|
| `SENTRY_DSN` | Vercel env (platform project + per-clinic) | Server-side error capture |
| `NEXT_PUBLIC_SENTRY_DSN` | Same | Browser-side error capture |

`SENTRY_DSN` is automatically copied to each clinic's Vercel project during provisioning. Set it once on the platform project and provisioning propagates it.

### Verifying Sentry is wired up
Trigger a test error on the Dr. Musallam site:
```
curl https://clinic-musallam.dreamcreate.web/api/health
```
Then throw a test exception from the Sentry dashboard "Send test event" button on the project.

---

## Uptime Monitoring (BetterStack)

### Where alerts go
- All downtime alerts fire a Slack DM to the CEO bot channel `D0B3HFJ5PG8`.
- Alert message format: `🔴 [Uptime Alert] <url> is DOWN — <cause>` / `🟢 ... is UP`

### Who responds
- Immediate: CTO agent checks Vercel deployment logs and Railway DB status.
- If down > 5 min: Escalate to Dustin via Slack DM.

### Env vars required
| Var | Where set | Purpose |
|-----|-----------|---------|
| `BETTERSTACK_API_TOKEN` | Vercel env (platform project) | Register monitors via API |
| `UPTIME_WEBHOOK_SECRET` | Vercel env (platform project) | Authenticate webhook POSTs |
| `SLACK_BOT_TOKEN` | Vercel env (platform project) | Send DMs on downtime |

### Webhook URL
Configure each uptime monitor to POST to:
```
https://<platform-domain>/api/uptime/webhook?secret=<UPTIME_WEBHOOK_SECRET>
```
This endpoint accepts BetterStack v3 JSON:API format and UptimeRobot flat format.

### Per-clinic monitor registration
Monitors are created automatically during clinic provisioning (after the `deploy` step). The BetterStack monitor ID is stored in `clinics.uptime_monitor_id`.

To manually register a monitor for an existing clinic:
1. Get the clinic's domain: `clinic-<slug>.dreamcreate.web`
2. Call `registerUptimeMonitor(slug, domain)` from `src/lib/uptime.ts` or via the BetterStack dashboard.
3. Store the monitor ID in `clinics.uptime_monitor_id` for that clinic.

### Simulating a downtime alert (synthetic test)
```bash
curl -X POST "https://<platform-domain>/api/uptime/webhook?secret=<UPTIME_WEBHOOK_SECRET>" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://clinic-musallam.dreamcreate.web","down":true,"reason":"Synthetic test"}'
```
Expected: Slack DM in `D0B3HFJ5PG8` within ~5 seconds.

---

## Common Failure Modes

### Clinic site returning 500
1. Check Vercel deployment logs for `clinic-<slug>` project.
2. Check Sentry for the error trace.
3. Check Railway DB: `DATABASE_URL` reachability.

### Clinic site DNS not resolving
1. Verify Vercel domain config: `addSubdomain` in provisioning may have soft-failed.
2. Manually add the domain in the Vercel dashboard under the clinic project.
3. Check Namecheap DNS for the `clinic-<slug>.dreamcreate.web` CNAME.

### Provisioning stuck in `provisioning` status
1. Query `provisioning_runs` for the clinic: `SELECT * FROM provisioning_runs WHERE clinic_id = '<id>' ORDER BY created_at DESC LIMIT 10;`
2. Identify the failed step and its error message.
3. Fix the underlying issue and re-trigger via `POST /api/admin/provision/<clinicId>`.

### Uptime monitor not registered
1. Check `clinics.uptime_monitor_id` is null.
2. Verify `BETTERSTACK_API_TOKEN` is set in Vercel env.
3. Re-register manually (see above).

---

## Escalation Path

| Severity | Who | How |
|----------|-----|-----|
| Site down > 5 min | Dustin | Slack DM `D0B3HFJ5PG8` |
| Billing/Stripe error | Dustin | Slack DM (mark urgent) |
| Data loss / DB issue | Dustin | Slack DM immediately |
| Build failure | CTO agent | Paperclip issue, high priority |
