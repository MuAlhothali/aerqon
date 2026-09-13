import type { EvidenceObject, EvidenceSource } from "../domain/types";

export type SyntheticSourceType = Extract<EvidenceSource["sourceType"],
  "SYNTHETIC_AWS_OBSERVATION" | "SYNTHETIC_SECURITY_HUB" | "SYNTHETIC_PROWLER">;

export interface SourceEnvelope {
  readonly sourceId: string;
  readonly sourceType: SyntheticSourceType;
  readonly sourceName: string;
  readonly sourceVersion?: string;
  readonly importerVersion: string;
  readonly assessmentId: string;
  readonly collectedAt: string;
  readonly classification: "DEMO DATA";
  readonly environment: "SYNTHETIC ENVIRONMENT";
  readonly customerData: false;
  readonly observations: readonly unknown[];
}

export interface PipelineDiagnostic {
  readonly code: "INVALID_ASSESSMENT" | "INVALID_SOURCE" | "INVALID_OBSERVATION" | "SOURCE_LINEAGE" | "CONFLICTING_ID" | "PIPELINE_INTEGRITY";
  readonly sourceId: string;
  readonly observationId: string;
  readonly message: string;
}

export type AdapterResult =
  | { success: false; diagnostics: readonly PipelineDiagnostic[] }
  | { success: true; source: Readonly<EvidenceSource>; evidence: readonly Readonly<EvidenceObject>[]; diagnostics: readonly PipelineDiagnostic[] };

// Adapters are trusted implementation ports; payloads are always untrusted.
export interface SyntheticAdapter {
  readonly sourceType: SyntheticSourceType;
  normalize(input: unknown): AdapterResult;
}
