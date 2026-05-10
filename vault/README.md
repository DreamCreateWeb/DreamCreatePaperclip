# Credential Vault

AES-256-GCM encrypted credential store for Dream Create agents.

## Data location

All runtime files live at `/paperclip/instances/default/companies/4c7f59b2-f19c-449b-af26-0cf3565c7196/vault/` (hardcoded in vault.js):

| File | Description |
|---|---|
| `vault.key` | 32-byte random AES key, generated on first run. Never share or commit. |
| `credentials.json.enc` | Encrypted credential store (IV + ciphertext + GCM tag, base64). |
| `audit.log` | Append-only JSONL audit trail. |

## CLI usage

```bash
# Read a credential (any agent)
node vault.js read <service_name>

# Write / update a credential (AccountManager or CEO only)
node vault.js write '<json_string>'

# List all service names (any agent)
node vault.js list

# View audit log (any agent; defaults to last 50 entries)
node vault.js audit [--limit N]
```

## Access control

| Operation | Who |
|---|---|
| `read` | Any caller with `PAPERCLIP_AGENT_ID` set |
| `list` | Any caller |
| `write` | AccountManager (`f04a66bb-cd85-43a9-9871-972ee3bc8350`) or CEO (`4e57472d-8f49-439d-bbeb-f0faf5c7aa23`) |
| `audit` | Any caller |

Unauthorized write attempts are logged as `write_denied` and exit with an error.

## Adding or updating a credential

Run as the AccountManager or CEO agent:

```bash
PAPERCLIP_AGENT_ID=<am-or-ceo-id> node vault.js write '{"service_name":"example","username":"user","password":"pass","mfa_method":"none","mfa_secret_ref":null,"last_rotated":"2026-05-10T00:00:00Z","format":"standard","security_tier":"standard","notes":""}'
```

`service_name` is the unique key. Re-writing an existing `service_name` replaces it.

## Entry schema

```json
{
  "service_name": "string (unique key)",
  "username": "string",
  "password": "string",
  "mfa_method": "none | email | totp | sms | push",
  "mfa_secret_ref": "string | null",
  "last_rotated": "ISO timestamp",
  "format": "throwaway | standard | sensitive",
  "security_tier": "throwaway | standard | sensitive",
  "notes": "string"
}
```

## Password tiers

| Tier | Example | Use case |
|---|---|---|
| throwaway | `Potatoes24` | Low-stakes test accounts |
| standard | `Potatoes24!` | Regular SaaS |
| sensitive | `Silver.Mouth(00)` | Financial, legal, PII — increment `(00)` suffix per unique account |

## Seeding

Run `vault-seed.js` once to populate the initial entries:

```bash
node vault-seed.js
```

This seeds: `google-default`, `__format_throwaway`, `__format_standard`, `__format_sensitive`.
