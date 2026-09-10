import type { SourceEnvelope } from "../../application/source-contract";
import { baselineTime } from "./direct-aws";

export const prowlerObservation = {
  uid: "admin-ingress", resource: { service: "EC2", type: "AWS::EC2::SecurityGroup", id: "sg-demo-admin", name: "sg-demo-admin", accountPlaceholder: "000000000000", region: "us-east-1" },
  collection: "DescribeSecurityGroups", observed_at: baselineTime,
  facts: { protocol: "tcp", fromPort: 22, toPort: 22, cidr: "0.0.0.0/0" }, expected_fields: ["protocol", "fromPort", "toPort", "cidr"],
  completeness: "COMPLETE", retrieval_state: "RETRIEVED", limitations: ["Synthetic Prowler-like format; Prowler was not executed."],
  Status: "PASS", Risk: "none", Severity: "informational", CheckStatus: "PASS",
};
export function prowlerSource(assessmentId = "assessment-northstar-baseline"): SourceEnvelope {
  return { sourceId: "northstar-prowler", sourceType: "SYNTHETIC_PROWLER", sourceName: "Northstar Prowler-like observations",
    sourceVersion: "1.0.0", importerVersion: "1.0.0", assessmentId, collectedAt: baselineTime,
    classification: "DEMO DATA", environment: "SYNTHETIC ENVIRONMENT", customerData: false, observations: [prowlerObservation] };
}
