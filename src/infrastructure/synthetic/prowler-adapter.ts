import { createSyntheticAdapter } from "./adapter-core";

export const prowlerAdapter = createSyntheticAdapter("SYNTHETIC_PROWLER", {
  id: "uid", resource: "resource", api: "collection", time: "observed_at", facts: "facts", expected: "expected_fields",
  completeness: "completeness", retrieval: "retrieval_state", limitations: "limitations",
  resourceKeys: ["service", "type", "id", "name", "accountPlaceholder", "region"],
  vendorStrings: ["Status", "Risk", "Severity", "CheckStatus"], vendorStatuses: [],
});
