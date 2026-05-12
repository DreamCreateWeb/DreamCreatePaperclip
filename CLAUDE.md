# Dream Create — Codebase Guide

## Overview

Dream Create is a Next.js 15 platform for autonomous dental clinic website management, provisioning, and operations.

## Google Drive

The platform integrates with Google Drive for clinic document storage and access.

### Service Account

- **Email**: `paperclip@dreamcreate-agent-workspace.iam.gserviceaccount.com`
- **Environment Variable**: `GOOGLE_SERVICE_ACCOUNT_JSON` (private; stored in Vercel)

To grant the app access to a Drive folder, share it with the SA email above. The SA will then have read/write access to listed folders and files.

### Module

Helper module: `src/lib/google/drive.ts`

**Exports:**
- `listFolder(folderId: string): Promise<Schema$File[]>` — list files in a folder
- `getFile(fileId: string): Promise<Schema$File>` — get file metadata
- `downloadFile(fileId: string): Promise<Buffer>` — download file content as Buffer

**Usage:**
```typescript
import { listFolder, getFile, downloadFile } from "@/src/lib/google/drive";

const files = await listFolder(sharedFolderId);
const file = await getFile(fileId);
const content = await downloadFile(fileId);
```

The module parses the service account JSON from `GOOGLE_SERVICE_ACCOUNT_JSON` env var at initialization. If missing or malformed, it logs a clear error and throws.
