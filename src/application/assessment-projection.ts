import { evaluationStates, type Assessment, type EvidenceObject, type EvidenceSource, type EvaluationState, type Finding, type RuleDefinition, type RuleEvaluation } from "../domain/types";
import { ruleDefinitions } from "../domain/rules";
import { compareText } from "../domain/evaluate";
import type { PipelineDiagnostic, SourceEnvelope } from "./source-contract";

export interface CoverageProjection {
  readonly counts: Readonly<Record<EvaluationState, number>>;
  readonly total: number;
  readonly validationFailures: number;
}
export interface AssessmentProjection {
  readonly assessment: Readonly<Assessment>;
  readonly classification: "DEMO DATA";
  readonly environment: "SYNTHETIC ENVIRONMENT";
  readonly customerData: false;
  readonly status: "COMPLETE" | "INCOMPLETE";
  readonly sourceManifest: readonly Readonly<EvidenceSource>[];
  readonly originalSources: readonly SourceEnvelope[];
  readonly ruleManifest: readonly Readonly<Pick<RuleDefinition, "ruleId" | "version" | "title" | "service" | "applicableResourceType" | "requiredEvidence" | "defaultSeverity" | "knownLimitations">>[];
  readonly normalizedEvidenceCount: number;
  readonly evidence: readonly Readonly<EvidenceObject>[];
  readonly evaluations: readonly RuleEvaluation[];
  readonly findings: readonly Finding[];
  readonly prioritizedFindings: readonly Finding[];
  readonly coverage: CoverageProjection;
  readonly diagnostics: readonly PipelineDiagnostic[];
  readonly limitations: readonly string[];
  readonly generatedAt: string;
}

export function projectCoverage(evaluations: readonly RuleEvaluation[], validationFailures = 0): CoverageProjection {
  const counts = Object.fromEntries(evaluationStates.map((state) => [state, 0])) as Record<EvaluationState, number>;
  for (const evaluation of evaluations) counts[evaluation.evaluationState]++;
  return Object.freeze({ counts: Object.freeze(counts), total: evaluations.length, validationFailures });
}

export function projectRuleManifest(): AssessmentProjection["ruleManifest"] {
  return Object.freeze(Object.values(ruleDefinitions).sort((a, b) => compareText(a.ruleId, b.ruleId)).map((rule) => Object.freeze({
    ruleId: rule.ruleId, version: rule.version, title: rule.title, service: rule.service,
    applicableResourceType: rule.applicableResourceType, requiredEvidence: rule.requiredEvidence,
    defaultSeverity: rule.defaultSeverity, knownLimitations: rule.knownLimitations,
  })));
}
