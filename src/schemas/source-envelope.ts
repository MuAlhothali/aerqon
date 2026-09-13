import type { SourceEnvelope } from "../application/source-contract";
import { copyBoundedJson, isRecord, isTimestamp } from "./evidence-schema";

export function hasOnlyKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return Object.keys(value).every((key) => keys.includes(key));
}
export function nonempty(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export type SourceValidation = { success: true; data: SourceEnvelope } | { success: false };

export function validateSourceEnvelope(input: unknown): SourceValidation {
  try {
    // Exactly the evidence boundary's descriptor checks, isolation and budgets.
    const value = copyBoundedJson(input);
    if (!isRecord(value) || !hasOnlyKeys(value, ["sourceId", "sourceType", "sourceName", "sourceVersion", "importerVersion",
      "assessmentId", "collectedAt", "classification", "environment", "customerData", "observations"])) return { success: false };
    if (!["sourceId", "sourceName", "importerVersion", "assessmentId"].every((key) => nonempty(value[key]))
      || (value.sourceVersion !== undefined && !nonempty(value.sourceVersion))
      || typeof value.sourceType !== "string"
      || !["SYNTHETIC_AWS_OBSERVATION", "SYNTHETIC_SECURITY_HUB", "SYNTHETIC_PROWLER"].includes(value.sourceType)
      || !isTimestamp(value.collectedAt) || value.classification !== "DEMO DATA"
      || value.environment !== "SYNTHETIC ENVIRONMENT" || value.customerData !== false
      || !Array.isArray(value.observations)) return { success: false };
    return { success: true, data: value as unknown as SourceEnvelope };
  } catch { return { success: false }; }
}
