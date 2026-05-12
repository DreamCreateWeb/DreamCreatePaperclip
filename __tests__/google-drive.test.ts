import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

vi.mock("googleapis", () => ({
  google: {
    auth: {
      GoogleAuth: vi.fn(),
    },
    drive: vi.fn(() => ({})),
  },
}));

describe("google-drive helper", () => {
  const savedEnv = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

  afterEach(() => {
    if (savedEnv === undefined) {
      delete process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    } else {
      process.env.GOOGLE_SERVICE_ACCOUNT_JSON = savedEnv;
    }
    vi.resetModules();
  });

  it("throws when GOOGLE_SERVICE_ACCOUNT_JSON is not set", async () => {
    delete process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    const { listFolder } = await import("@/src/lib/google/drive");
    await expect(listFolder("some-folder-id")).rejects.toThrow(
      "GOOGLE_SERVICE_ACCOUNT_JSON is not set",
    );
  });

  it("throws when GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON", async () => {
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON = "not-valid-json{{{";
    const { listFolder } = await import("@/src/lib/google/drive");
    await expect(listFolder("some-folder-id")).rejects.toThrow(
      "GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON",
    );
  });

  it("exports listFolder, getFile, downloadFile functions", async () => {
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON = JSON.stringify({
      type: "service_account",
      project_id: "test",
    });
    const mod = await import("@/src/lib/google/drive");
    expect(typeof mod.listFolder).toBe("function");
    expect(typeof mod.getFile).toBe("function");
    expect(typeof mod.downloadFile).toBe("function");
  });
});
