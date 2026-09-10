import { createSyntheticAdapter } from "./adapter-core";

export const securityHubAdapter = createSyntheticAdapter("SYNTHETIC_SECURITY_HUB", {
  id: "Id", resource: "Resource", api: "CollectionApi", time: "ObservedAt", facts: "Facts", expected: "ExpectedFields",
  completeness: "Completeness", retrieval: "RetrievalState", limitations: "Limitations",
  resourceKeys: ["Service", "Type", "Id", "Name", "Account", "Region"], vendorStrings: ["Severity"], vendorStatuses: ["Compliance", "Workflow"],
});
