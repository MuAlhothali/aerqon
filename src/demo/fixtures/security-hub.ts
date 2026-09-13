import type { SourceEnvelope } from "../../application/source-contract";
import { baselineTime } from "./direct-aws";

export const securityHubObservation = {
  Id: "admin-ingress", Resource: { Service: "EC2", Type: "AWS::EC2::SecurityGroup", Id: "sg-demo-admin", Name: "sg-demo-admin", Account: "000000000000", Region: "us-east-1" },
  CollectionApi: "DescribeSecurityGroups", ObservedAt: baselineTime,
  Facts: { protocol: "tcp", fromPort: 22, toPort: 22, cidr: "0.0.0.0/0" }, ExpectedFields: ["protocol", "fromPort", "toPort", "cidr"],
  Completeness: "COMPLETE", RetrievalState: "RETRIEVED", Limitations: ["Synthetic Security Hub-like format; not a vendor API response."],
  Severity: "INFORMATIONAL", Compliance: { Status: "PASS" }, Workflow: { Status: "RESOLVED" },
};
export function securityHubSource(assessmentId = "assessment-northstar-baseline"): SourceEnvelope {
  return { sourceId: "northstar-security-hub", sourceType: "SYNTHETIC_SECURITY_HUB", sourceName: "Northstar Security Hub-like observations",
    sourceVersion: "1.0.0", importerVersion: "1.0.0", assessmentId, collectedAt: baselineTime,
    classification: "DEMO DATA", environment: "SYNTHETIC ENVIRONMENT", customerData: false, observations: [securityHubObservation] };
}
