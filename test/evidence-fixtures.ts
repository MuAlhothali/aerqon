import { syntheticEvidence } from "../src/demo/northstar";
import type { EvidenceObject } from "../src/domain/types";
import type { SupportedRuleId } from "../src/domain/rules";

// Explicit fixture identities, independent of the production rule manifest.
export function ruleEvidence(ruleId: SupportedRuleId, overrides: Partial<EvidenceObject> = {}): EvidenceObject {
  const identity = ruleId.startsWith("S3-")
    ? { service: "S3", resourceType: "AWS::S3::Bucket", resourceId: "bucket-synthetic-001", resourceName: "demo-bucket", sourceApi: "GetBucketPolicyStatus" }
    : ruleId.startsWith("RDS-")
      ? { service: "RDS", resourceType: "AWS::RDS::DBInstance", resourceId: "db-synthetic-001", resourceName: "demo-database", sourceApi: "DescribeDBInstances" }
      : { service: "EC2", resourceType: "AWS::EC2::SecurityGroup", resourceId: "sg-synthetic-001", resourceName: "demo-security-group", sourceApi: "DescribeSecurityGroups" };
  return syntheticEvidence({ ...identity, ...overrides });
}
