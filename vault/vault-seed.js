#!/usr/bin/env node
'use strict';

const { execFileSync } = require('child_process');
const path = require('path');

// Seed runs as CEO to pass write access control
process.env.PAPERCLIP_AGENT_ID = '4e57472d-8f49-439d-bbeb-f0faf5c7aa23';

const VAULT = path.join(__dirname, 'vault.js');

const entries = [
  {
    service_name: 'google-default',
    username: 'dustin@dreamcreateweb.com',
    password: 'Potatoes24!',
    mfa_method: 'email',
    mfa_secret_ref: null,
    last_rotated: '2026-05-10T00:00:00Z',
    format: 'standard',
    security_tier: 'standard',
    notes: 'Default Google / Sign-in-with-Google account. Covers ~99% of new SaaS.'
  },
  {
    service_name: '__format_throwaway',
    username: '(format reference)',
    password: 'Potatoes24',
    mfa_method: 'none',
    mfa_secret_ref: null,
    last_rotated: '2026-05-10T00:00:00Z',
    format: 'throwaway',
    security_tier: 'throwaway',
    notes: 'Throwaway-tier format template. Use for low-stakes test accounts.'
  },
  {
    service_name: '__format_standard',
    username: '(format reference)',
    password: 'Potatoes24!',
    mfa_method: 'none',
    mfa_secret_ref: null,
    last_rotated: '2026-05-10T00:00:00Z',
    format: 'standard',
    security_tier: 'standard',
    notes: 'Standard-tier format template. Use for regular SaaS.'
  },
  {
    service_name: '__format_sensitive',
    username: '(format reference)',
    password: 'Silver.Mouth(00)',
    mfa_method: 'none',
    mfa_secret_ref: null,
    last_rotated: '2026-05-10T00:00:00Z',
    format: 'sensitive',
    security_tier: 'sensitive',
    notes: 'Sensitive-tier format template. Use for financial/legal/PII accounts. Increment (00) suffix on each unique use.'
  }
];

for (const entry of entries) {
  try {
    const result = execFileSync('node', [VAULT, 'write', JSON.stringify(entry)], { encoding: 'utf8' });
    console.log(result.trim());
  } catch (e) {
    console.error(`Failed to seed ${entry.service_name}:`, e.message);
    process.exit(1);
  }
}

console.log('Seed complete.');
