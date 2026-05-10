#!/usr/bin/env node
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const VAULT_DIR = '/paperclip/instances/default/companies/4c7f59b2-f19c-449b-af26-0cf3565c7196/vault';
const KEY_FILE = path.join(VAULT_DIR, 'vault.key');
const ENC_FILE = path.join(VAULT_DIR, 'credentials.json.enc');
const AUDIT_FILE = path.join(VAULT_DIR, 'audit.log');

const AM_AGENT_ID = 'f04a66bb-cd85-43a9-9871-972ee3bc8350';
const CEO_AGENT_ID = '4e57472d-8f49-439d-bbeb-f0faf5c7aa23';

function getKey() {
  if (fs.existsSync(KEY_FILE)) {
    return fs.readFileSync(KEY_FILE);
  }
  const key = crypto.randomBytes(32);
  fs.mkdirSync(VAULT_DIR, { recursive: true });
  fs.writeFileSync(KEY_FILE, key, { mode: 0o600 });
  return key;
}

function encrypt(key, plaintext) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Layout: iv(12) + ciphertext(N) + tag(16), base64-encoded
  return Buffer.concat([iv, ciphertext, tag]).toString('base64');
}

function decrypt(key, encoded) {
  const buf = Buffer.from(encoded, 'base64');
  const iv = buf.slice(0, 12);
  const tag = buf.slice(buf.length - 16);
  const ciphertext = buf.slice(12, buf.length - 16);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}

function loadVault(key) {
  if (!fs.existsSync(ENC_FILE)) return [];
  const encoded = fs.readFileSync(ENC_FILE, 'utf8').trim();
  if (!encoded) return [];
  return JSON.parse(decrypt(key, encoded));
}

function saveVault(key, entries) {
  const json = JSON.stringify(entries, null, 2);
  const encoded = encrypt(key, json);
  fs.mkdirSync(VAULT_DIR, { recursive: true });
  fs.writeFileSync(ENC_FILE, encoded, { mode: 0o600 });
}

function appendAudit(entry) {
  fs.mkdirSync(VAULT_DIR, { recursive: true });
  fs.appendFileSync(AUDIT_FILE, JSON.stringify(entry) + '\n');
}

function getAgentId() {
  return process.env.PAPERCLIP_AGENT_ID || 'unknown';
}

function canWrite() {
  const agentId = getAgentId();
  return agentId === AM_AGENT_ID || agentId === CEO_AGENT_ID;
}

const [, , cmd, ...args] = process.argv;

switch (cmd) {
  case 'read': {
    const serviceName = args[0];
    if (!serviceName) {
      console.error('Usage: vault.js read <service_name>');
      process.exit(1);
    }
    const key = getKey();
    const entries = loadVault(key);
    const entry = entries.find(e => e.service_name === serviceName);
    appendAudit({ ts: new Date().toISOString(), agentId: getAgentId(), service: serviceName, action: 'read' });
    if (!entry) {
      console.error(`Not found: ${serviceName}`);
      process.exit(1);
    }
    console.log(JSON.stringify(entry, null, 2));
    break;
  }

  case 'write': {
    const jsonStr = args[0];
    if (!jsonStr) {
      console.error('Usage: vault.js write <json_string>');
      process.exit(1);
    }
    let newEntry;
    try {
      newEntry = JSON.parse(jsonStr);
    } catch {
      console.error('Invalid JSON');
      process.exit(1);
    }
    if (!newEntry.service_name) {
      console.error('service_name is required');
      process.exit(1);
    }
    const agentId = getAgentId();
    if (!canWrite()) {
      appendAudit({ ts: new Date().toISOString(), agentId, service: newEntry.service_name, action: 'write_denied' });
      console.error('Write denied: only AccountManager and CEO agents may write credentials.');
      process.exit(1);
    }
    const key = getKey();
    const entries = loadVault(key);
    const idx = entries.findIndex(e => e.service_name === newEntry.service_name);
    if (idx >= 0) {
      entries[idx] = newEntry;
    } else {
      entries.push(newEntry);
    }
    saveVault(key, entries);
    appendAudit({ ts: new Date().toISOString(), agentId, service: newEntry.service_name, action: 'write' });
    console.log(`Saved: ${newEntry.service_name}`);
    break;
  }

  case 'list': {
    const key = getKey();
    const entries = loadVault(key);
    entries.forEach(e => console.log(e.service_name));
    break;
  }

  case 'audit': {
    const limitIdx = args.indexOf('--limit');
    const limit = limitIdx >= 0 ? parseInt(args[limitIdx + 1], 10) : 50;
    if (!fs.existsSync(AUDIT_FILE)) {
      console.log('No audit log.');
      break;
    }
    const lines = fs.readFileSync(AUDIT_FILE, 'utf8').trim().split('\n').filter(Boolean);
    const recent = lines.slice(-limit);
    recent.forEach(l => console.log(l));
    break;
  }

  default: {
    console.error('Usage: vault.js <read|write|list|audit> [args]');
    process.exit(1);
  }
}
