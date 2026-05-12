import { google, drive_v3 } from "googleapis";

let driveClient: drive_v3.Drive | null = null;

function getServiceAccount(): Record<string, unknown> {
  const json = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!json) {
    const msg = "[google-drive] GOOGLE_SERVICE_ACCOUNT_JSON env var not set";
    console.error(msg);
    throw new Error(msg);
  }

  try {
    return JSON.parse(json);
  } catch (err) {
    const msg = `[google-drive] Failed to parse GOOGLE_SERVICE_ACCOUNT_JSON: ${err instanceof Error ? err.message : String(err)}`;
    console.error(msg);
    throw new Error(msg);
  }
}

function initDriveClient(): drive_v3.Drive {
  if (driveClient) return driveClient;

  const serviceAccount = getServiceAccount();
  const auth = new google.auth.JWT({
    email: serviceAccount.client_email as string,
    key: serviceAccount.private_key as string,
    scopes: ["https://www.googleapis.com/auth/drive"],
  });

  driveClient = google.drive({ version: "v3", auth });
  return driveClient;
}

export async function listFolder(folderId: string): Promise<drive_v3.Schema$File[]> {
  const drive = initDriveClient();
  const query = `'${folderId}' in parents and trashed=false`;

  const res = await drive.files.list({
    q: query,
    spaces: "drive",
    pageSize: 100,
    fields: "files(id, name, mimeType, createdTime, modifiedTime, parents)",
  });

  return res.data.files ?? [];
}

export async function getFile(fileId: string): Promise<drive_v3.Schema$File> {
  const drive = initDriveClient();
  const res = await drive.files.get({
    fileId,
    fields: "id, name, mimeType, createdTime, modifiedTime, parents, webViewLink",
  });

  return res.data;
}

export async function downloadFile(fileId: string): Promise<Buffer> {
  const drive = initDriveClient();
  const res = await drive.files.get(
    { fileId, alt: "media" },
    { responseType: "arraybuffer" },
  );

  return Buffer.from(res.data as ArrayBuffer);
}
