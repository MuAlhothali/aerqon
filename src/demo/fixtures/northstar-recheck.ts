import { northstarAssessment } from "../northstar";
import { directAwsSource, directObservations } from "./direct-aws";
import type { DirectObservation } from "../../infrastructure/synthetic/direct-aws-adapter";

export function northstarRecheck() {
  const assessmentId = "assessment-northstar-recheck";
  const observedAt = "2026-09-10T00:00:00.000Z";
  const observations: DirectObservation[] = directObservations.filter((item) => ["sg-demo-admin", "northstar-demo-public-assets", "northstar-demo-legacy-db"].includes(item.resource.id))
    .map((item) => ({ ...item, observedAt,
      ...(item.resource.id === "sg-demo-admin" ? { fields: { protocol: "tcp", fromPort: 22, toPort: 22, cidr: "10.0.0.0/8" } } : {}),
      ...(item.api === "GetBucketPolicyStatus" ? { fields: {}, completeness: "PARTIAL" as const, retrievalState: "UNAVAILABLE" as const } : {}),
    }));
  const sources = [directAwsSource(assessmentId, observations, observedAt)];
  return { assessment: { ...northstarAssessment, assessmentId, assessmentDate: observedAt, status: "RECHECK" as const,
    evidenceSourceIds: sources.map((source) => source.sourceId) }, sources, options: { generatedAt: "2026-09-10T01:00:00.000Z" } };
}
