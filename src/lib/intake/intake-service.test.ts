import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { decryptSubmissionRow } from "./intake-service";
import type { IntakeSubmission } from "@/src/db/schema";

const TEST_KEY = "a".repeat(64);

describe("intake-service", () => {
  before(() => {
    process.env.INTAKE_ENCRYPTION_KEY = TEST_KEY;
  });

  after(() => {
    delete process.env.INTAKE_ENCRYPTION_KEY;
  });

  it("decryptSubmissionRow gracefully handles malformed patientName ciphertext", () => {
    const malformedSubmission: IntakeSubmission = {
      id: "test-id",
      clinicId: "clinic-id",
      templateId: "template-id",
      appointmentId: null,
      patientName: "malformed:ciphertext",
      patientEmail: "valid.ciphertext",
      patientDob: null,
      responses: "valid.ciphertext",
      status: "pending",
      reviewedByOwnerId: null,
      reviewedAt: null,
      submittedIp: null,
      createdAt: new Date(),
    };

    const result = decryptSubmissionRow(malformedSubmission);
    assert.equal(result.patientName, "[decryption error]");
    assert.equal(result.clinicId, "clinic-id");
    assert.equal(result.templateId, "template-id");
  });

  it("decryptSubmissionRow handles multiple failed fields", () => {
    const malformedSubmission: IntakeSubmission = {
      id: "test-id",
      clinicId: "clinic-id",
      templateId: "template-id",
      appointmentId: null,
      patientName: "malformed",
      patientEmail: "also:malformed",
      patientDob: "bad:format",
      responses: "corrupted",
      status: "pending",
      reviewedByOwnerId: null,
      reviewedAt: null,
      submittedIp: null,
      createdAt: new Date(),
    };

    const result = decryptSubmissionRow(malformedSubmission);
    assert.equal(result.patientName, "[decryption error]");
    assert.equal(result.patientEmail, "[decryption error]");
    assert.equal(result.patientDob, "[decryption error]");
    assert.equal(result.responses, "[decryption error]");
  });

  it("decryptSubmissionRow handles null patientDob", () => {
    const submission: IntakeSubmission = {
      id: "test-id",
      clinicId: "clinic-id",
      templateId: "template-id",
      appointmentId: null,
      patientName: "corrupted",
      patientEmail: "also:bad",
      patientDob: null,
      responses: "error",
      status: "pending",
      reviewedByOwnerId: null,
      reviewedAt: null,
      submittedIp: null,
      createdAt: new Date(),
    };

    const result = decryptSubmissionRow(submission);
    assert.equal(result.patientDob, null);
  });
});
