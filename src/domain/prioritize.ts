import type { Confidence, EvaluationState, Finding, PriorityBand, Severity } from "./types";

export interface PriorityContext {
  production?: boolean;
  externallyRelevant?: boolean;
  commercialTriggerRelevant?: boolean;
  remediationFeasible?: boolean;
}
export interface PriorityInput extends PriorityContext {
  evaluationState: EvaluationState; severity: Severity; confidence: Confidence; stableKey: string;
}
export interface PriorityResult { band: PriorityBand; rationale: string; sortKey: readonly number[]; stableKey: string; }
const severityRank: Record<Severity, number> = { CRITICAL: 5, HIGH: 4, MEDIUM: 3, LOW: 2, INFO: 1 };
const confidenceRank: Record<Confidence, number> = { HIGH: 3, MEDIUM: 2, LOW: 1 };
const textCompare = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;

export function prioritize(input: PriorityInput): PriorityResult {
  if (input.evaluationState !== "FAIL") return { band: "P3", rationale: "Not a confirmed failure; coverage or evidence context only.", sortKey: [0, 0, 0, 0, 0, 0, 0], stableKey: input.stableKey };
  // Existing internal band heuristic; no risk score is exposed. Only explicitly
  // known true dimensions contribute. Unknown is not described as false.
  const score = severityRank[input.severity] + (input.production === true ? 2 : 0) + Number(input.externallyRelevant === true)
    + confidenceRank[input.confidence] + Number(input.commercialTriggerRelevant === true) + Number(input.remediationFeasible === true);
  const band: PriorityBand = score >= 11 ? "P0" : score >= 9 ? "P1" : score >= 6 ? "P2" : "P3";
  const dimension = (name: string, value: boolean | undefined) => name + ": " + (value === undefined ? "unavailable (neutral)" : String(value));
  return {
    band,
    rationale: ["Confirmed failure", "severity " + input.severity, "confidence " + input.confidence,
      dimension("production", input.production), dimension("external exposure relevance", input.externallyRelevant),
      dimension("commercial trigger relevance", input.commercialTriggerRelevant), dimension("remediation feasibility", input.remediationFeasible),
      "Bands are an internal prioritization heuristic, not a validated risk score."].join("; "),
    sortKey: [1, severityRank[input.severity], Number(input.production === true), Number(input.externallyRelevant === true),
      confidenceRank[input.confidence], Number(input.commercialTriggerRelevant === true), Number(input.remediationFeasible === true)],
    stableKey: input.stableKey,
  };
}

export function comparePriorities(a: PriorityResult, b: PriorityResult): number {
  for (let i = 0; i < a.sortKey.length; i++) {
    const difference = b.sortKey[i] - a.sortKey[i];
    if (difference) return difference;
  }
  return textCompare(a.stableKey, b.stableKey);
}

export function sortFindings(findings: readonly Finding[]): Finding[] {
  return [...findings].sort((a, b) => {
    const dimensions = textCompare(a.priorityBand, b.priorityBand)
      || severityRank[b.severity] - severityRank[a.severity]
      || confidenceRank[b.confidence] - confidenceRank[a.confidence];
    return dimensions || textCompare(a.service, b.service) || textCompare(a.ruleId, b.ruleId)
      || textCompare(a.resourceId, b.resourceId) || textCompare(a.findingId, b.findingId);
  });
}
