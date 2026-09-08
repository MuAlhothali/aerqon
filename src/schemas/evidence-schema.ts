import type { EvidenceObject } from "../domain/types";

const forbiddenKeys = new Set(["__proto__", "prototype", "constructor"]);
const maxStringLength = 10_000;
type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function safeValue(value: unknown): boolean {
  if (typeof value === "string") return value.length <= maxStringLength;
  if (value === null || typeof value === "boolean" || typeof value === "number") return true;
  if (Array.isArray(value)) return value.every(safeValue);
  return isRecord(value) && Object.keys(value).every((key) => !forbiddenKeys.has(key) && safeValue(value[key]));
}

const stringFields = ["evidenceId", "assessmentId", "sourceId", "service", "resourceType", "resourceId", "resourceName", "accountPlaceholder", "region", "sourceApi", "observedAt"] as const;

export type EvidenceValidationResult = { success: true; data: EvidenceObject } | { success: false; issues: readonly string[] };

export function validateEvidenceObject(input: unknown): EvidenceValidationResult {
  if (!isRecord(input)) return { success: false, issues: ["Evidence must be an object."] };
  const issues = stringFields.filter((field) => typeof input[field] !== "string" || (input[field] as string).length === 0 || (input[field] as string).length > maxStringLength).map((field) => `${field} must be a bounded non-empty string.`);
  if (!isRecord(input.observedFields) || !safeValue(input.observedFields)) issues.push("observedFields contains an invalid or unsafe value.");
  if (!Array.isArray(input.expectedFields) || !input.expectedFields.every((item) => typeof item === "string")) issues.push("expectedFields must be a string array.");
  if (!Array.isArray(input.limitations) || !input.limitations.every((item) => typeof item === "string")) issues.push("limitations must be a string array.");
  if (!["COMPLETE", "PARTIAL", "INSUFFICIENT"].includes(String(input.completeness))) issues.push("Invalid completeness.");
  if (!["RETRIEVED", "ACCESS_DENIED", "UNAVAILABLE"].includes(String(input.retrievalState))) issues.push("Invalid retrievalState.");
  if (input.validationState !== "VALID") issues.push("Evidence must have validationState VALID.");
  if (issues.length > 0) return { success: false, issues };
  return { success: true, data: input as unknown as EvidenceObject };
}
