import type { Confidence, PriorityBand, Severity } from "../domain/types";

export interface PriorityInput { evaluationState: "FAIL" | "PASS" | "UNKNOWN" | "NOT_EVALUATED" | "ACCESS_DENIED" | "PARTIAL_EVIDENCE" | "NOT_APPLICABLE"; severity: Severity; confidence: Confidence; production: boolean; externallyRelevant: boolean; commercialTriggerRelevant: boolean; remediationFeasible: boolean; stableKey: string; }
export interface PriorityResult { band: PriorityBand; rationale: string; sortKey: readonly number[]; }
const severityRank: Record<Severity, number> = { CRITICAL: 5, HIGH: 4, MEDIUM: 3, LOW: 2, INFO: 1 };
const confidenceRank: Record<Confidence, number> = { HIGH: 3, MEDIUM: 2, LOW: 1 };

export function prioritize(input: PriorityInput): PriorityResult {
  if (input.evaluationState !== "FAIL") return { band: "P3", rationale: "Not a confirmed failure; retained as coverage or evidence context rather than prioritized risk.", sortKey: [0, 0, 0, 0, 0, 0, 0] };
  const score = severityRank[input.severity] + (input.production ? 2 : 0) + (input.externallyRelevant ? 1 : 0) + confidenceRank[input.confidence] + (input.commercialTriggerRelevant ? 1 : 0) + (input.remediationFeasible ? 1 : 0);
  const band: PriorityBand = score >= 11 ? "P0" : score >= 9 ? "P1" : score >= 6 ? "P2" : "P3";
  return { band, rationale: `Confirmed failure; severity ${input.severity}, ${input.production ? "production" : "non-production"} context, ${input.confidence} confidence, and deterministic tie-breaker ${input.stableKey}.`, sortKey: [1, severityRank[input.severity], Number(input.production), Number(input.externallyRelevant), confidenceRank[input.confidence], Number(input.commercialTriggerRelevant), Number(input.remediationFeasible)] };
}
