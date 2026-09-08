import { ruleDefinitions, type SupportedRuleId } from "./rules";
import { validateEvidenceObject } from "../schemas/evidence-schema";
import type { Confidence, EvidenceCompleteness, EvidenceObject, EvaluationState, RuleEvaluation, Severity } from "./types";

export interface EvaluationContext { assessmentId: string; evaluatedAt: string; inScope?: boolean; }
const findingStates: ReadonlySet<EvaluationState> = new Set(["FAIL"]);
const base = (ruleId: SupportedRuleId, context: EvaluationContext, evidence: readonly EvidenceObject[], state: EvaluationState, rationale: string, diagnosticCode: string, completeness: EvidenceCompleteness, confidence: Confidence): RuleEvaluation => {
  const rule = ruleDefinitions[ruleId];
  return { evaluationId: `${context.assessmentId}:${ruleId}:${evidence.map((item) => item.evidenceId).join(",") || "none"}`, assessmentId: context.assessmentId, ruleId, ruleVersion: rule.version, evidenceIds: evidence.map((item) => item.evidenceId), evaluatedAt: context.evaluatedAt, evaluationState: state, rationale, severity: rule.defaultSeverity as Severity, severityRationale: rule.severityRationale, confidence, confidenceRationale: confidence === "HIGH" ? "Required evidence was complete and retrieved." : "Evidence cannot support high-confidence interpretation.", evidenceCompleteness: completeness, diagnosticCode, findingCreated: findingStates.has(state) };
};

const fields = (evidence: readonly EvidenceObject[]) => evidence[0]?.observedFields ?? {};
const incomplete = (evidence: readonly EvidenceObject[]) => evidence.some((item) => item.retrievalState === "ACCESS_DENIED") ? "ACCESS_DENIED" : evidence.some((item) => item.completeness !== "COMPLETE" || item.retrievalState !== "RETRIEVED") ? "PARTIAL_EVIDENCE" : undefined;

export function evaluateRule(ruleId: SupportedRuleId, evidence: readonly EvidenceObject[], context: EvaluationContext): RuleEvaluation {
  const rule = ruleDefinitions[ruleId];
  if (!context.inScope) return base(ruleId, context, evidence, "NOT_EVALUATED", "Rule is outside the current evaluation scope.", "OUT_OF_SCOPE", "INSUFFICIENT", "LOW");
  if (evidence.some((item) => item.assessmentId !== context.assessmentId)) return base(ruleId, context, evidence, "UNKNOWN", "Evidence belongs to a different assessment and cannot be interpreted here.", "CROSS_ASSESSMENT_EVIDENCE", "INSUFFICIENT", "LOW");
  if (evidence.some((item) => item.validationState !== "VALID" || !validateEvidenceObject(item).success)) return base(ruleId, context, evidence, "UNKNOWN", "Evidence failed validation and cannot support an evaluation.", "INVALID_EVIDENCE", "INSUFFICIENT", "LOW");
  const unavailable = incomplete(evidence);
  if (unavailable === "ACCESS_DENIED") return base(ruleId, context, evidence, "ACCESS_DENIED", "Required evidence could not be retrieved because access was denied.", "ACCESS_DENIED", "INSUFFICIENT", "LOW");
  if (unavailable) return base(ruleId, context, evidence, "PARTIAL_EVIDENCE", "Required evidence is incomplete; no definitive conclusion is made.", "INCOMPLETE_EVIDENCE", "PARTIAL", "LOW");
  if (evidence.length === 0) return base(ruleId, context, evidence, "UNKNOWN", "No evidence was supplied for the rule.", "MISSING_EVIDENCE", "INSUFFICIENT", "LOW");
  if (!evidence.every((item) => item.sourceApi === rule.requiredEvidence[0] || rule.requiredEvidence.includes(item.sourceApi))) return base(ruleId, context, evidence, "NOT_APPLICABLE", "Evidence does not match this rule's required API.", "IRRELEVANT_EVIDENCE", "COMPLETE", "HIGH");
  const observed = fields(evidence);
  const fail = (() => {
    if (ruleId === "SG-001") return observed.protocol === "tcp" && observed.fromPort === 22 && ["0.0.0.0/0", "::/0"].includes(String(observed.cidr));
    if (ruleId === "SG-002") return observed.protocol === "-1" && observed.cidr === "0.0.0.0/0";
    if (ruleId === "S3-001") return observed.isPublic === true;
    if (ruleId === "S3-002") return observed.defaultEncryptionEnabled === false;
    if (ruleId === "RDS-001") return observed.publiclyAccessible === true;
    return observed.storageEncrypted === false;
  })();
  const wording = ruleId === "RDS-001" && fail ? "Configured as publicly accessible; this does not establish end-to-end network reachability." : fail ? "Complete evidence demonstrates the control condition is violated." : "Complete evidence demonstrates the control condition is satisfied.";
  return base(ruleId, context, evidence, fail ? "FAIL" : "PASS", wording, fail ? "CONFIRMED_VIOLATION" : "CONFIRMED_COMPLIANCE", "COMPLETE", "HIGH");
}
