import { prioritize, type PriorityContext } from "./prioritize";
import { sameResource, verifyEvaluation } from "./evaluate";
import { isTimestamp, validateEvidenceObject } from "../schemas/evidence-schema";
import { ruleDefinitions, type SupportedRuleId } from "./rules";
import type { Finding, RuleEvaluation } from "./types";

export type FindingGeneration =
  | { kind: "ACTIVE_FINDING"; finding: Finding }
  | { kind: "COVERAGE_ISSUE" | "EVIDENCE_REVIEW" | "NONE"; evaluationId: string }
  | { kind: "REJECTED"; reason: string };

export function generateFinding(evaluation: RuleEvaluation, input: readonly unknown[], now: string, context: PriorityContext = {}): FindingGeneration {
  if (!isTimestamp(now) || !verifyEvaluation(evaluation, input) || now < evaluation.evaluatedAt) {
    return { kind: "REJECTED", reason: "Evaluation does not match the supplied evidence or creation time." };
  }
  if (evaluation.evaluationState !== "FAIL") {
    const kind = evaluation.evaluationState === "PARTIAL_EVIDENCE" ? "EVIDENCE_REVIEW"
      : ["ACCESS_DENIED", "UNKNOWN", "NOT_EVALUATED"].includes(evaluation.evaluationState) ? "COVERAGE_ISSUE" : "NONE";
    return { kind, evaluationId: evaluation.evaluationId };
  }
  const evidence = input.map(validateEvidenceObject);
  const match = evidence.find((item) => item.success && evaluation.evidenceIds[0] === item.data.evidenceId);
  if (!match?.success || match.data.assessmentId !== evaluation.assessmentId || !sameResource(match.data, evaluation.resource)) {
    return { kind: "REJECTED", reason: "Finding evidence identity does not match its evaluation." };
  }
  const resource = match.data;
  const rule = ruleDefinitions[evaluation.ruleId as SupportedRuleId];
  const priority = prioritize({ ...context, evaluationState: evaluation.evaluationState, severity: evaluation.severity,
    confidence: evaluation.confidence, stableKey: JSON.stringify([resource.service, rule.ruleId, resource.resourceId, evaluation.evaluationId]) });
  return { kind: "ACTIVE_FINDING", finding: {
    assessmentId: evaluation.assessmentId, accountPlaceholder: resource.accountPlaceholder,
    findingId: evaluation.evaluationId + ":finding", evaluationId: evaluation.evaluationId,
    ruleId: evaluation.ruleId, ruleVersion: evaluation.ruleVersion, service: resource.service,
    resourceType: resource.resourceType, resourceId: resource.resourceId, resourceName: resource.resourceName, region: resource.region,
    severity: evaluation.severity, confidence: evaluation.confidence, evaluationState: evaluation.evaluationState, remediationState: "OPEN",
    priorityBand: priority.band, priorityRationale: priority.rationale, title: rule.title, summary: evaluation.rationale,
    whyItMatters: rule.severityRationale, potentialBusinessImpact: "Requires customer review in the assessment context; impact is not quantified.",
    recommendation: rule.remediationGuidance, recommendedOwner: "Engineering", verificationSteps: [rule.verificationCondition],
    limitations: [...rule.knownLimitations, ...resource.limitations], evidenceCompleteness: evaluation.evidenceCompleteness,
    firstSeenAt: now, lastSeenAt: now,
  } };
}
