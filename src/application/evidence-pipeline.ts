import { compareText, evaluateRule, resourceIdentity } from "../domain/evaluate";
import { generateFinding } from "../domain/findings";
import { sortFindings, type PriorityContext } from "../domain/prioritize";
import { ruleDefinitions, type SupportedRuleId } from "../domain/rules";
import type { Assessment, EvidenceObject, EvidenceSource, Finding, RuleEvaluation } from "../domain/types";
import { copyBoundedJson, isRecord, isTimestamp, validateEvidenceObject } from "../schemas/evidence-schema";
import { hasOnlyKeys, nonempty, validateSourceEnvelope } from "../schemas/source-envelope";
import { projectCoverage, projectRuleManifest, type AssessmentProjection } from "./assessment-projection";
import type { PipelineDiagnostic, SourceEnvelope, SyntheticAdapter } from "./source-contract";

export interface PipelineOptions {
  generatedAt: string;
  excludedRuleIds?: readonly SupportedRuleId[];
  excludedChecks?: readonly { ruleId: SupportedRuleId; resourceId: string }[];
  priorityContext?: PriorityContext;
}
export type PipelineResult = { success: true; projection: AssessmentProjection } | { success: false; diagnostics: readonly PipelineDiagnostic[] };

// Only called with already bounded, descriptor-validated JSON, never raw input.
function canonical(value: unknown): string {
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  if (isRecord(value)) return "{" + Object.keys(value).sort(compareText).map((key) => JSON.stringify(key) + ":" + canonical(value[key])).join(",") + "}";
  return JSON.stringify(value);
}
const diagnostic = (code: PipelineDiagnostic["code"], message: string, sourceId = "", observationId = ""): PipelineDiagnostic => ({ code, message, sourceId, observationId });
const reject = (code: PipelineDiagnostic["code"], message: string): PipelineResult => ({ success: false, diagnostics: [diagnostic(code, message)] });

function parseAssessment(input: unknown): Readonly<Assessment> | undefined {
  try {
    const value = copyBoundedJson(input);
    if (!isRecord(value) || !hasOnlyKeys(value, ["assessmentId", "classification", "environmentName", "trigger", "accountPlaceholder", "regions", "scope", "assessmentDate", "reviewer", "status", "evidenceSourceIds"])) return;
    if (!["assessmentId", "trigger", "scope", "reviewer", "accountPlaceholder"].every((key) => nonempty(value[key]))
      || value.classification !== "SYNTHETIC" || value.environmentName !== "SYNTHETIC ENVIRONMENT"
      || !isTimestamp(value.assessmentDate) || typeof value.status !== "string" || !["DRAFT", "COMPLETE", "RECHECK"].includes(value.status)) return;
    for (const key of ["regions", "evidenceSourceIds"] as const) {
      if (!Array.isArray(value[key]) || !value[key].every(nonempty) || new Set(value[key]).size !== value[key].length) return;
    }
    return Object.freeze({ ...value, regions: Object.freeze([...value.regions as string[]].sort(compareText)),
      evidenceSourceIds: Object.freeze([...value.evidenceSourceIds as string[]].sort(compareText)) }) as unknown as Readonly<Assessment>;
  } catch { return; }
}

export function runEvidencePipeline(assessmentInput: unknown, sourceInput: unknown, optionsInput: PipelineOptions,
  adapters: readonly SyntheticAdapter[]): PipelineResult {
  const assessment = parseAssessment(assessmentInput);
  if (!assessment) return reject("INVALID_ASSESSMENT", "Invalid bounded synthetic assessment.");
  let options: PipelineOptions;
  let sources: readonly unknown[];
  try {
    const value = copyBoundedJson(optionsInput);
    if (!isRecord(value) || !hasOnlyKeys(value, ["generatedAt", "excludedRuleIds", "excludedChecks", "priorityContext"])
      || !isTimestamp(value.generatedAt) || value.generatedAt < assessment.assessmentDate) return reject("INVALID_ASSESSMENT", "Invalid explicit evaluation time.");
    if (value.excludedRuleIds !== undefined && (!Array.isArray(value.excludedRuleIds)
      || !value.excludedRuleIds.every((id) => typeof id === "string" && Object.hasOwn(ruleDefinitions, id)))) return reject("INVALID_ASSESSMENT", "Invalid explicit rule scope.");
    if (value.priorityContext !== undefined && (!isRecord(value.priorityContext)
      || !hasOnlyKeys(value.priorityContext, ["production", "externallyRelevant", "commercialTriggerRelevant", "remediationFeasible"])
      || !Object.values(value.priorityContext).every((item) => typeof item === "boolean"))) return reject("INVALID_ASSESSMENT", "Priority context must contain known boolean facts only.");
    options = value as unknown as PipelineOptions;
    if (value.excludedChecks !== undefined && (!Array.isArray(value.excludedChecks) || !value.excludedChecks.every((check) =>
      isRecord(check) && hasOnlyKeys(check, ["ruleId", "resourceId"]) && typeof check.ruleId === "string"
      && Object.hasOwn(ruleDefinitions, check.ruleId) && nonempty(check.resourceId)))) return reject("INVALID_ASSESSMENT", "Invalid explicit resource/control scope.");
    const raw = copyBoundedJson(sourceInput);
    if (!Array.isArray(raw) || raw.length > 16) return reject("INVALID_SOURCE", "Expected at most 16 bounded synthetic source envelopes.");
    sources = raw;
  } catch { return reject("INVALID_SOURCE", "Input exceeds the bounded JSON contract or contains unsafe values."); }

  const evidenceById = new Map<string, Readonly<EvidenceObject>>();
  const manifest = new Map<string, Readonly<EvidenceSource>>();
  const originals: SourceEnvelope[] = [];
  const diagnostics: PipelineDiagnostic[] = [];
  for (const raw of sources) {
    const parsed = validateSourceEnvelope(raw);
    if (!parsed.success) return reject("INVALID_SOURCE", "Invalid synthetic source envelope.");
    const envelope = parsed.data;
    if (envelope.assessmentId !== assessment.assessmentId || !assessment.evidenceSourceIds.includes(envelope.sourceId)
      || envelope.collectedAt > options.generatedAt || manifest.has(envelope.sourceId)) return reject("SOURCE_LINEAGE", "Source assessment, declaration, chronology or uniqueness does not match.");
    const matches = adapters.filter((adapter) => adapter.sourceType === envelope.sourceType);
    if (matches.length !== 1) return reject("INVALID_SOURCE", "Exactly one adapter must be registered for the source format.");
    const normalized = matches[0].normalize(envelope);
    if (!normalized.success) return { success: false, diagnostics: normalized.diagnostics };
    // Source metadata belongs to the envelope, not to an adapter's default values.
    if (normalized.source.sourceId !== envelope.sourceId || normalized.source.sourceType !== envelope.sourceType
      || normalized.source.sourceName !== envelope.sourceName || normalized.source.sourceVersion !== (envelope.sourceVersion ?? "UNSPECIFIED")
      || normalized.source.importerVersion !== envelope.importerVersion || normalized.source.collectedAt !== envelope.collectedAt
      || normalized.source.classification !== "SYNTHETIC") return reject("SOURCE_LINEAGE", "Adapter source manifest does not match envelope.");
    manifest.set(envelope.sourceId, normalized.source);
    originals.push(envelope);
    diagnostics.push(...normalized.diagnostics);
    for (const candidate of normalized.evidence) {
      const validated = validateEvidenceObject(candidate);
      if (!validated.success) { diagnostics.push(diagnostic("INVALID_OBSERVATION", "Normalized evidence failed domain validation.", envelope.sourceId)); continue; }
      const item = validated.data;
      if (item.assessmentId !== assessment.assessmentId || item.sourceId !== envelope.sourceId
        || item.accountPlaceholder !== assessment.accountPlaceholder || !assessment.regions.includes(item.region)
        || item.observedAt > envelope.collectedAt) {
        diagnostics.push(diagnostic("SOURCE_LINEAGE", "Evidence identity or collection chronology is outside the declared assessment.", envelope.sourceId, item.evidenceId)); continue;
      }
      const previous = evidenceById.get(item.evidenceId);
      if (previous && canonical(previous) !== canonical(item)) {
        diagnostics.push(diagnostic("CONFLICTING_ID", "One evidence ID identifies conflicting observations.", envelope.sourceId, item.evidenceId));
        // Keep a deterministic representative for diagnostics, never evaluation.
        if (compareText(canonical(item), canonical(previous)) < 0) evidenceById.set(item.evidenceId, item);
      } else evidenceById.set(item.evidenceId, item);
    }
  }
  if (manifest.size !== assessment.evidenceSourceIds.length) return reject("SOURCE_LINEAGE", "A declared source envelope is missing.");
  const evidence = [...evidenceById.values()].sort((a, b) => compareText(a.evidenceId, b.evidenceId));
  const evaluations: RuleEvaluation[] = [];
  const findings: Finding[] = [];
  // Do not drop malformed observations and then claim compliance from the rest.
  // Retain evidence/diagnostics in an INCOMPLETE projection; withhold conclusions.
  if (!diagnostics.length) {
    const groups = new Map<string, Readonly<EvidenceObject>[]>();
    for (const item of evidence) {
      const key = JSON.stringify(resourceIdentity(item));
      const group = groups.get(key) ?? [];
      group.push(item); groups.set(key, group);
    }
    if (!groups.size) groups.set("no-observed-resources", []);
    for (const key of [...groups.keys()].sort(compareText)) {
      const group = groups.get(key)!;
      for (const ruleId of Object.keys(ruleDefinitions).sort(compareText) as SupportedRuleId[]) {
        // The domain owns all applicability/completeness decisions, including NA.
        const evaluation = evaluateRule(ruleId, group, { assessmentId: assessment.assessmentId,
          evaluatedAt: options.generatedAt, inScope: !options.excludedRuleIds?.includes(ruleId)
            && !options.excludedChecks?.some((check) => check.ruleId === ruleId && check.resourceId === group[0]?.resourceId) });
        evaluations.push(evaluation);
        if (evaluation.evaluationState !== "FAIL") continue;
        const generated = generateFinding(evaluation, group, options.generatedAt, options.priorityContext);
        if (generated.kind !== "ACTIVE_FINDING") return reject("PIPELINE_INTEGRITY", "Domain rejected an eligible finding; no projection issued.");
        findings.push(generated.finding);
      }
    }
  }
  const orderedDiagnostics = [...new Map(diagnostics.map((item) => [canonical(item), item])).entries()]
    .sort(([a], [b]) => compareText(a, b)).map(([, item]) => Object.freeze(item));
  return { success: true, projection: Object.freeze({
    assessment, classification: "DEMO DATA", environment: "SYNTHETIC ENVIRONMENT", customerData: false,
    status: diagnostics.length ? "INCOMPLETE" : "COMPLETE",
    sourceManifest: Object.freeze([...manifest.values()].sort((a, b) => compareText(a.sourceId, b.sourceId))),
    originalSources: Object.freeze(originals.sort((a, b) => compareText(a.sourceId, b.sourceId))),
    ruleManifest: projectRuleManifest(), normalizedEvidenceCount: evidence.length, evidence: Object.freeze(evidence),
    evaluations: Object.freeze(evaluations), findings: Object.freeze(findings), prioritizedFindings: Object.freeze(sortFindings(findings)),
    coverage: projectCoverage(evaluations, orderedDiagnostics.length), diagnostics: Object.freeze(orderedDiagnostics),
    limitations: Object.freeze(["DEMO DATA", "SYNTHETIC ENVIRONMENT", "NOT CUSTOMER DATA",
      "Coverage is per observed resource and rule, not an inventory or compliance percentage.",
      "Vendor conclusions are ignored; only supplied raw observations are evaluated.",
      "Local provenance consistency is not cryptographic source authentication.",
      ...(diagnostics.length ? ["Normalization errors withhold all security conclusions; valid evidence remains available for inspection."] : []),
      ...new Set(evidence.flatMap((item) => item.limitations).sort(compareText)),
    ]), generatedAt: options.generatedAt,
  }) };
}
