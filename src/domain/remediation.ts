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
  if (!verifyRecheckEvidence(finding, verification, verifiedAt) || verification.evaluation.evaluationState !== "PASS") return finding;
  return { ...finding, evaluationId: verification.evaluation.evaluationId, evaluationState: "PASS",
    remediationState: "RESOLVED", resolvedAt: verifiedAt, lastSeenAt: verifiedAt };
}

export function verifyRecheckEvidence(finding: Finding, verification: ResolutionVerification, verifiedAt: string): boolean {
  // Runtime checks also reject legacy JS callers passing a naked boolean.
  if (!isRecord(verification) || !isRecord(verification.evaluation) || !Array.isArray(verification.evidence)) return false;
  const evaluation = verification.evaluation;
  if (!isTimestamp(verifiedAt) || !isTimestamp(finding.lastSeenAt)
    || !verifyEvaluation(evaluation, verification.evidence)
    || evaluation.assessmentId !== finding.assessmentId
    || evaluation.ruleId !== finding.ruleId || evaluation.ruleVersion !== finding.ruleVersion
    || !sameResource(evaluation.resource, finding)
    || evaluation.evaluatedAt < finding.lastSeenAt || verifiedAt < evaluation.evaluatedAt) return false;
  // A newly timestamped evaluation of stale observations is not a recheck.
  const valid = verification.evidence.map(validateEvidenceObject);
  return valid.length > 0 && valid.every((item) => item.success && item.data.observedAt >= finding.lastSeenAt);
}

export function verifyRecheck(finding: Finding, verification: ResolutionVerification, verifiedAt: string): Finding {
  if (!verifyRecheckEvidence(finding, verification, verifiedAt)) return finding;
  if (verification.evaluation.evaluationState === "PASS") return verifyResolution(finding, verification, verifiedAt);
  if (verification.evaluation.evaluationState === "FAIL" && finding.remediationState === "RESOLVED") {
    return { ...finding, evaluationId: verification.evaluation.evaluationId, evaluationState: "FAIL",
      remediationState: "REOPENED", reopenedAt: verifiedAt, lastSeenAt: verifiedAt };
  }
  return finding;
}
