import { prioritize } from "../application/prioritize";
import type { EvidenceObject, Finding, RuleDefinition, RuleEvaluation } from "./types";

export type FindingGeneration = { kind: "ACTIVE_FINDING"; finding: Finding } | { kind: "COVERAGE_ISSUE" | "EVIDENCE_REVIEW" | "DIAGNOSTIC" | "NONE"; evaluationId: string };
export function generateFinding(evaluation: RuleEvaluation, rule: RuleDefinition, evidence: EvidenceObject, now: string): FindingGeneration {
  if (evaluation.evaluationState !== "FAIL") {
    const kind = evaluation.evaluationState === "PARTIAL_EVIDENCE" ? "EVIDENCE_REVIEW" : ["ACCESS_DENIED", "UNKNOWN", "NOT_EVALUATED"].includes(evaluation.evaluationState) ? "COVERAGE_ISSUE" : "NONE";
    return { kind, evaluationId: evaluation.evaluationId };
  }
  const priority = prioritize({ evaluationState: evaluation.evaluationState, severity: evaluation.severity, confidence: evaluation.confidence, production: true, externallyRelevant: rule.category === "NETWORK" || rule.category === "DATA_EXPOSURE", commercialTriggerRelevant: false, remediationFeasible: true, stableKey: evidence.resourceId });
  return { kind: "ACTIVE_FINDING", finding: { findingId: `${evaluation.evaluationId}:finding`, evaluationId: evaluation.evaluationId, ruleId: evaluation.ruleId, ruleVersion: evaluation.ruleVersion, service: evidence.service, resourceType: evidence.resourceType, resourceId: evidence.resourceId, resourceName: evidence.resourceName, region: evidence.region, severity: evaluation.severity, confidence: evaluation.confidence, evaluationState: evaluation.evaluationState, remediationState: "OPEN", priorityBand: priority.band, priorityRationale: priority.rationale, title: rule.title, summary: evaluation.rationale, whyItMatters: rule.severityRationale, potentialBusinessImpact: "Requires customer review in the assessment context; impact is not quantified.", recommendation: rule.remediationGuidance, recommendedOwner: "Engineering", verificationSteps: [rule.verificationCondition], limitations: rule.knownLimitations, evidenceCompleteness: evaluation.evidenceCompleteness, firstSeenAt: now, lastSeenAt: now } };
}
