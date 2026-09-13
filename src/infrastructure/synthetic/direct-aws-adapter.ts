import { createSyntheticAdapter } from "./adapter-core";
import type { EvidenceObject } from "../../domain/types";

export interface DirectObservation {
  observationId: string;
  resource: { service: string; type: string; id: string; name: string; accountPlaceholder: string; region: string };
  api: string; observedAt: string; fields: EvidenceObject["observedFields"]; expectedFields: readonly string[];
  completeness: EvidenceObject["completeness"]; retrievalState: EvidenceObject["retrievalState"]; limitations: readonly string[];
}

export const directAwsAdapter = createSyntheticAdapter("SYNTHETIC_AWS_OBSERVATION", {
  id: "observationId", resource: "resource", api: "api", time: "observedAt", facts: "fields", expected: "expectedFields",
  completeness: "completeness", retrieval: "retrievalState", limitations: "limitations",
  resourceKeys: ["service", "type", "id", "name", "accountPlaceholder", "region"], vendorStrings: [], vendorStatuses: [],
});
