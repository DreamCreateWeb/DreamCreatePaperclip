import { google } from "googleapis";
import type { drive_v3 } from "googleapis";

function getServiceAccountCredentials(): Record<string, unknown> {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) {
    const msg = "[google-drive] GOOGLE_SERVICE_ACCOUNT_JSON is not set";
    console.error(msg);
    throw new Error(msg);
  }
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    const msg = "[google-drive] GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON";
    console.error(msg);
    throw new Error(msg);
  }
}

function getDriveClient(): drive_v3.Drive {
  const credentials = getServiceAccountCredentials();
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/drive.readonly"],
  });
  return google.drive({ version: "v3", auth });
}

export async function listFolder(folderId: string): Promise<drive_v3.Schema$File[]> {
  const drive = getDriveClient();
  const escapedId = folderId.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  const res = await drive.files.list({
    q: `'${escapedId}' in parents and trashed = false`,
    fields: "files(id, name, mimeType, size, modifiedTime, webViewLink)",
  });
  return res.data.files ?? [];
}

export async function getFile(fileId: string): Promise<drive_v3.Schema$File> {
  const drive = getDriveClient();
  const res = await drive.files.get({
    fileId,
    fields: "id, name, mimeType, size, modifiedTime, webViewLink",
  });
  return res.data;
}

export async function downloadFile(fileId: string): Promise<Buffer> {
  const drive = getDriveClient();
  const res = await drive.files.get(
    { fileId, alt: "media" },
    { responseType: "arraybuffer" },
  );
  return Buffer.from(res.data as ArrayBuffer);
}
