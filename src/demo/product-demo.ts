import { runEvidencePipeline } from "../application/evidence-pipeline";
import { projectWorkflow } from "../application/prototype-workflow";
import { syntheticAdapters } from "./evidence-prototype";
import { northstarBaseline } from "./fixtures/northstar-baseline";
import { directAwsSource, directObservations } from "./fixtures/direct-aws";
import type { RemediationAction } from "../domain/types";

export function buildProductDemo() {
  const fixture = northstarBaseline();
  const assessment = { ...fixture.assessment, trigger: "Enterprise customer security review", scope: "Synthetic EC2 security groups, S3 buckets and RDS instances; six configuration controls." };
  const excludedChecks = [{ ruleId: "S3-002" as const, resourceId: "northstar-demo-logs" }];
  const baseline = runEvidencePipeline(assessment, fixture.sources, { ...fixture.options, excludedChecks }, syntheticAdapters);
  const time = "2026-09-10T00:00:00.000Z";
  const observations = directObservations.map((item) => ({ ...item, observedAt: time,
    ...(item.resource.id === "sg-demo-admin" ? { fields: { protocol: "tcp", fromPort: 22, toPort: 22, cidr: "10.0.0.0/8" } } : {}),
    ...(item.resource.id === "northstar-demo-public-assets" && item.api === "GetBucketPolicyStatus"
      ? { fields: {}, completeness: "PARTIAL" as const, retrievalState: "UNAVAILABLE" as const } : {}),
  }));
  // A second immutable evidence snapshot within the same assessment. No
  // cross-assessment relabeling of existing evidence and no historical mutation.
  const source = directAwsSource(assessment.assessmentId, observations, time);
  const current = runEvidencePipeline({ ...assessment, evidenceSourceIds: [source.sourceId], status: "RECHECK" }, [source],
    { generatedAt: "2026-09-10T01:00:00.000Z", excludedChecks }, syntheticAdapters);
  if (!baseline.success || !current.success) throw new Error("Synthetic product fixtures did not validate.");
  const actions: RemediationAction[] = baseline.projection.findings.map((finding) => ({
    actionId: finding.findingId + ":action", findingId: finding.findingId,
    owner: finding.service === "S3" ? "Cloud Engineering" : finding.service === "RDS" ? "Data Platform" : "Platform Engineering",
    status: finding.ruleId === "S3-001" ? "IN_PROGRESS" : "OPEN", actionDescription: finding.recommendation,
    verificationCondition: finding.verificationSteps.join(" "), notes: "Synthetic workflow assignment for the enterprise review demonstration.",
  }));
  return projectWorkflow(baseline.projection, current.projection, actions);
}
