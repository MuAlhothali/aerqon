import type { DirectObservation } from "../../infrastructure/synthetic/direct-aws-adapter";
import type { SourceEnvelope } from "../../application/source-contract";

export const baselineTime = "2026-09-09T00:00:00.000Z";
export const baselineGeneratedAt = "2026-09-09T01:00:00.000Z";

function observation(service: string, type: string, id: string, api: string, fields: DirectObservation["fields"],
  extra: Partial<DirectObservation> = {}): DirectObservation {
  return { observationId: JSON.stringify([id, api]), resource: { service, type, id, name: id, accountPlaceholder: "000000000000", region: "us-east-1" },
    api, observedAt: baselineTime, fields, expectedFields: Object.keys(fields), completeness: "COMPLETE", retrievalState: "RETRIEVED",
    limitations: ["DEMO DATA", "SYNTHETIC ENVIRONMENT", "NOT CUSTOMER DATA"], ...extra };
}

export const directObservations: readonly DirectObservation[] = [
  observation("EC2", "AWS::EC2::SecurityGroup", "sg-demo-admin", "DescribeSecurityGroups", { protocol: "tcp", fromPort: 22, toPort: 22, cidr: "0.0.0.0/0" }),
  observation("EC2", "AWS::EC2::SecurityGroup", "sg-demo-web", "DescribeSecurityGroups", { protocol: "tcp", fromPort: 443, toPort: 443, cidr: "0.0.0.0/0" }),
  observation("EC2", "AWS::EC2::SecurityGroup", "sg-demo-all", "DescribeSecurityGroups", { protocol: "-1", cidr: "0.0.0.0/0" }),
  observation("S3", "AWS::S3::Bucket", "northstar-demo-public-assets", "GetPublicAccessBlock", { publicAccessBlockEnabled: false }),
  observation("S3", "AWS::S3::Bucket", "northstar-demo-public-assets", "GetBucketPolicyStatus", { isPublic: true }),
  observation("S3", "AWS::S3::Bucket", "northstar-demo-private-backups", "GetPublicAccessBlock", { publicAccessBlockEnabled: true }),
  observation("S3", "AWS::S3::Bucket", "northstar-demo-private-backups", "GetBucketPolicyStatus", { isPublic: false }),
  observation("S3", "AWS::S3::Bucket", "northstar-demo-private-backups", "GetEncryptionConfiguration", { defaultEncryptionEnabled: true }),
  observation("S3", "AWS::S3::Bucket", "northstar-demo-logs", "GetPublicAccessBlock", { publicAccessBlockEnabled: true }),
  observation("S3", "AWS::S3::Bucket", "northstar-demo-logs", "GetBucketPolicyStatus", { isPublic: false }),
  observation("S3", "AWS::S3::Bucket", "northstar-demo-archive", "GetEncryptionConfiguration", {}, { retrievalState: "ACCESS_DENIED", completeness: "INSUFFICIENT", expectedFields: ["defaultEncryptionEnabled"], limitations: ["Encryption API explicitly denied; encryption configuration is unverified."] }),
  observation("RDS", "AWS::RDS::DBInstance", "northstar-demo-prod-db", "DescribeDBInstances", { publiclyAccessible: true, storageEncrypted: true }),
  observation("RDS", "AWS::RDS::DBInstance", "northstar-demo-legacy-db", "DescribeDBInstances", { publiclyAccessible: false, storageEncrypted: false }),
];

export function directAwsSource(assessmentId = "assessment-northstar-baseline", observations: readonly DirectObservation[] = directObservations,
  collectedAt = baselineTime): SourceEnvelope {
  return { sourceId: "northstar-direct", sourceType: "SYNTHETIC_AWS_OBSERVATION", sourceName: "Northstar direct synthetic observations",
    sourceVersion: "1.0.0", importerVersion: "1.0.0", assessmentId, collectedAt,
    classification: "DEMO DATA", environment: "SYNTHETIC ENVIRONMENT", customerData: false, observations };
}
