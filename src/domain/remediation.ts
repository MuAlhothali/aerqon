import { sameResource, verifyEvaluation } from "./evaluate";
import { isRecord, isTimestamp, validateEvidenceObject } from "../schemas/evidence-schema";
import type { Finding, RemediationAction, RuleEvaluation } from "./types";

export function recordCustomerReportedRemediation(action: RemediationAction, reportedAt: string, notes: string): RemediationAction {
  return { ...action, customerReportedAt: reportedAt, notes };
}

export interface ResolutionVerification {
  evaluation: RuleEvaluation;
  evidence: readonly unknown[];
}

export function verifyResolution(finding: Finding, verification: ResolutionVerification, verifiedAt: string): Finding {
  // Runtime checks also reject legacy JS callers passing a naked boolean.
  if (!isRecord(verification) || !isRecord(verification.evaluation) || !Array.isArray(verification.evidence)) return finding;
  const evaluation = verification.evaluation;
  if (!isTimestamp(verifiedAt) || !isTimestamp(finding.lastSeenAt)
    || !verifyEvaluation(evaluation, verification.evidence)
    || evaluation.evaluationState !== "PASS"
    || evaluation.assessmentId !== finding.assessmentId
    || evaluation.ruleId !== finding.ruleId || evaluation.ruleVersion !== finding.ruleVersion
    || !sameResource(evaluation.resource, finding)
    || evaluation.evaluatedAt < finding.lastSeenAt || verifiedAt < evaluation.evaluatedAt) return finding;
  // A newly timestamped evaluation of stale observations is not a recheck.
  const valid = verification.evidence.map(validateEvidenceObject);
  if (!valid.length || valid.some((item) => !item.success || item.data.observedAt < finding.lastSeenAt)) return finding;
  return { ...finding, evaluationId: evaluation.evaluationId, evaluationState: "PASS",
    remediationState: "RESOLVED", resolvedAt: verifiedAt, lastSeenAt: verifiedAt };
}
