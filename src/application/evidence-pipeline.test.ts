import { describe, expect, it } from "vitest";
import { runEvidencePipeline } from "./evidence-pipeline";
import { runNorthstarPrototype, syntheticAdapters } from "../demo/evidence-prototype";
import { northstarBaseline } from "../demo/fixtures/northstar-baseline";
import { northstarRecheck } from "../demo/fixtures/northstar-recheck";
import { directAwsSource, directObservations } from "../demo/fixtures/direct-aws";
import { securityHubSource } from "../demo/fixtures/security-hub";
import { prowlerSource } from "../demo/fixtures/prowler";
import { evaluateRule, verifyEvaluation } from "../domain/evaluate";
import { generateFinding } from "../domain/findings";
import { verifyResolution } from "../domain/remediation";
import type { SourceEnvelope } from "./source-contract";
import type { AssessmentProjection } from "./assessment-projection";

function project(input = northstarBaseline()): AssessmentProjection {
  const result = runEvidencePipeline(input.assessment, input.sources, input.options, syntheticAdapters);
  if (!result.success) throw new Error(JSON.stringify(result.diagnostics));
  return result.projection;
}
const baseline = project();

describe("Northstar baseline and recheck", () => {
  it.each([
    ["SG-001", "sg-demo-admin", "FAIL"], ["SG-001", "sg-demo-web", "PASS"], ["SG-002", "sg-demo-all", "FAIL"],
    ["S3-001", "northstar-demo-public-assets", "FAIL"], ["S3-001", "northstar-demo-private-backups", "PASS"],
    ["S3-002", "northstar-demo-private-backups", "PASS"], ["S3-001", "northstar-demo-logs", "PASS"],
    ["S3-002", "northstar-demo-archive", "ACCESS_DENIED"], ["RDS-001", "northstar-demo-prod-db", "FAIL"],
    ["RDS-002", "northstar-demo-prod-db", "PASS"], ["RDS-001", "northstar-demo-legacy-db", "PASS"], ["RDS-002", "northstar-demo-legacy-db", "FAIL"],
  ])("%s on %s produces %s", (ruleId, resourceId, expected) => {
    const evaluation = baseline.evaluations.find((item) => item.ruleId === ruleId && item.resource?.resourceId === resourceId)!;
    expect(evaluation.evaluationState).toBe(expected);
    expect(baseline.findings.some((finding) => finding.evaluationId === evaluation.evaluationId)).toBe(expected === "FAIL");
  });
  it("retains cautious RDS wording and does not call denied encryption unencrypted", () => {
    expect(baseline.findings.find((item) => item.ruleId === "RDS-001")!.summary).toBe("Configured as publicly accessible; end-to-end network reachability was not established.");
    expect(baseline.findings.some((item) => item.resourceId === "northstar-demo-archive")).toBe(false);
  });
  it("evaluates the second assessment without automatically resolving baseline findings", () => {
    const result = runNorthstarPrototype(true);
    if (!result.success) throw new Error("Expected recheck");
    for (const [rule, resource, state] of [["SG-001", "sg-demo-admin", "PASS"], ["RDS-002", "northstar-demo-legacy-db", "FAIL"], ["S3-001", "northstar-demo-public-assets", "PARTIAL_EVIDENCE"]]) {
      expect(result.projection.evaluations.find((item) => item.ruleId === rule && item.resource?.resourceId === resource)!.evaluationState).toBe(state);
    }
    expect(result.projection.assessment.assessmentId).not.toBe(baseline.assessment.assessmentId);
    expect(result.projection.findings.every((item) => item.remediationState === "OPEN")).toBe(true);
    expect(baseline.findings.every((item) => item.remediationState === "OPEN")).toBe(true);
  });
  it.each(["PARTIAL_EVIDENCE", "ACCESS_DENIED", "NOT_APPLICABLE"] as const)("%s cannot resolve even within matching assessment/resource lineage", (state) => {
    const fixture = northstarRecheck();
    const assessment = { ...fixture.assessment, assessmentId: baseline.assessment.assessmentId };
    const originals = fixture.sources[0].observations as typeof directObservations;
    const observations = originals.filter((item) => item.resource.id === "northstar-demo-public-assets").map((item) => ({ ...item,
      ...(state === "ACCESS_DENIED" ? { retrievalState: "ACCESS_DENIED" as const } : {}),
      ...(state === "NOT_APPLICABLE" ? { api: "UnrelatedCollection" } : {}),
    }));
    const sources = [{ ...fixture.sources[0], assessmentId: assessment.assessmentId, observations }];
    const result = runEvidencePipeline(assessment, sources, fixture.options, syntheticAdapters);
    if (!result.success) throw new Error("Expected diagnostic projection");
    const evaluation = result.projection.evaluations.find((item) => item.ruleId === "S3-001")!;
    expect(evaluation.evaluationState).toBe(state);
    const open = baseline.findings.find((item) => item.ruleId === "S3-001")!;
    expect(verifyResolution(open, { evaluation, evidence: result.projection.evidence }, fixture.options.generatedAt)).toBe(open);
  });
});

describe("pipeline determinism and provenance", () => {
  it("repeated runs, reversed sources, reversed observations and duplicate observations are identical", () => {
    const input = northstarBaseline();
    expect(project()).toEqual(baseline);
    const reordered = { ...input, sources: [...input.sources].reverse().map((source) => ({ ...source, observations: [...source.observations].reverse() })) };
    // Original imports preserve their supplied record order; normalized evidence
    // and every security conclusion remain order-independent.
    const { originalSources: reorderedOriginals, ...reorderedProjection } = project(reordered);
    const { originalSources: baselineOriginals, ...baselineProjection } = baseline;
    expect(reorderedProjection).toEqual(baselineProjection);
    expect(reorderedOriginals).not.toEqual(baselineOriginals);
    const duplicated = { ...input, sources: input.sources.map((source) => ({ ...source, observations: [...source.observations, ...source.observations] })) };
    const { originalSources: duplicatedOriginals, ...duplicatedProjection } = project(duplicated);
    expect(duplicatedProjection).toEqual(baselineProjection);
    expect(duplicatedOriginals[0].observations.length).toBe(baselineOriginals[0].observations.length * 2);
    expect(baseline.normalizedEvidenceCount).toBe(15); expect(baseline.findings).toHaveLength(6);
  });
  it("preserves source manifest → evidence → binding → evaluation → finding identity", () => {
    for (const finding of baseline.findings) {
      const evaluation = baseline.evaluations.find((item) => item.evaluationId === finding.evaluationId)!;
      const evidence = baseline.evidence.filter((item) => evaluation.evidenceIds.includes(item.evidenceId));
      expect(verifyEvaluation(evaluation, evidence)).toBe(true);
      expect(generateFinding(evaluation, evidence, baseline.generatedAt)).toEqual({ kind: "ACTIVE_FINDING", finding });
      for (const binding of evaluation.evidenceBindings) {
        expect(evidence.find((item) => item.evidenceId === binding.evidenceId)!.sourceId).toBe(binding.sourceId);
        expect(baseline.sourceManifest.some((item) => item.sourceId === binding.sourceId)).toBe(true);
      }
    }
  });
  it("rejects an end-to-end source swap after normalization", () => {
    const evaluation = baseline.evaluations.find((item) => item.ruleId === "SG-001" && item.resource?.resourceId === "sg-demo-admin")!;
    const evidence = baseline.evidence.filter((item) => evaluation.evidenceIds.includes(item.evidenceId));
    expect(evidence).toHaveLength(3);
    const swapped = evidence.map((item, index) => ({ ...item, sourceId: evidence[(index + 1) % evidence.length].sourceId }));
    expect(new Set(swapped.map((item) => item.sourceId))).toEqual(new Set(evidence.map((item) => item.sourceId)));
    expect(verifyEvaluation(evaluation, swapped)).toBe(false);
    expect(generateFinding(evaluation, swapped, baseline.generatedAt).kind).toBe("REJECTED");
  });
  it("equivalent normalized facts are source-brand neutral", () => {
    const sources = [directAwsSource(undefined, [directObservations[0]]), securityHubSource(), prowlerSource()];
    const conclusions = sources.map((source) => {
      const input = northstarBaseline();
      const projection = project({ ...input, assessment: { ...input.assessment, evidenceSourceIds: [source.sourceId] }, sources: [source] });
      const evaluation = projection.evaluations.find((item) => item.ruleId === "SG-001")!;
      return { evaluation, evidence: projection.evidence[0], finding: projection.findings[0] };
    });
    expect(new Set(sources.map((source) => source.sourceType)).size).toBe(3);
    expect(new Set(conclusions.map((item) => item.evidence.sourceId)).size).toBe(3);
    for (const item of conclusions) {
      expect(item.evidence.observedFields).toEqual(conclusions[0].evidence.observedFields);
      expect(item.evaluation.evaluationState).toBe("FAIL"); expect(item.evaluation.severity).toBe("HIGH");
      expect(item.evaluation.confidence).toBe("HIGH"); expect(item.finding.priorityBand).toBe(conclusions[0].finding.priorityBand);
    }
  });
  it("descriptive source metadata changes do not change domain conclusions", () => {
    const input = northstarBaseline();
    const changed = project({ ...input, sources: input.sources.map((source) => ({ ...source,
      sourceName: "Different display name", sourceVersion: "2.0.0", importerVersion: "3.0.0",
    })) });
    expect(changed.sourceManifest).not.toEqual(baseline.sourceManifest);
    expect(changed.evidence).toEqual(baseline.evidence);
    expect(changed.evaluations).toEqual(baseline.evaluations);
    expect(changed.prioritizedFindings).toEqual(baseline.prioritizedFindings);
  });
});

describe("pipeline input failures and applicability", () => {
  it.each([
    { assessmentId: "other" }, { customerData: true }, { sourceType: "FUTURE_CUSTOMER_UPLOAD" }, { sourceId: "undeclared" },
    { collectedAt: "2026-09-10T00:00:00.000Z" },
  ])("rejects unsafe source context %j", (overrides) => {
    const input = northstarBaseline();
    expect(runEvidencePipeline(input.assessment, [{ ...input.sources[0], ...overrides }, ...input.sources.slice(1)], input.options, syntheticAdapters).success).toBe(false);
  });
  it("rejects missing and duplicate source manifests", () => {
    const input = northstarBaseline();
    for (const sources of [input.sources.slice(1), [...input.sources, input.sources[0]]]) {
      expect(runEvidencePipeline(input.assessment, sources, input.options, syntheticAdapters).success).toBe(false);
    }
  });
  it.each([{ region: "outside" }, { accountPlaceholder: "other" }])("does not silently consume evidence outside declared identity: %j", (override) => {
    const input = northstarBaseline();
    const source = directAwsSource(undefined, [{ ...directObservations[0], resource: { ...directObservations[0].resource, ...override } }]);
    const result = project({ ...input, sources: [source], assessment: { ...input.assessment, evidenceSourceIds: [source.sourceId] } });
    expect(result.status).toBe("INCOMPLETE"); expect(result.diagnostics[0].code).toBe("SOURCE_LINEAGE"); expect(result.findings).toEqual([]);
  });
  it("does not drop malformed observations and falsely conclude PASS from remaining evidence", () => {
    const input = northstarBaseline();
    const source = directAwsSource(undefined, [directObservations[1]]);
    const broken: SourceEnvelope = { ...source, observations: [...source.observations, { invalid: true }] };
    const result = project({ ...input, sources: [broken], assessment: { ...input.assessment, evidenceSourceIds: [source.sourceId] } });
    expect(result.status).toBe("INCOMPLETE"); expect(result.normalizedEvidenceCount).toBe(1);
    expect(result.evaluations).toEqual([]); expect(result.findings).toEqual([]); expect(result.coverage.validationFailures).toBe(1);
  });
  it("conflicting observation IDs withhold conclusions independently of input order", () => {
    const input = northstarBaseline();
    const a = directObservations[0]; const b = { ...a, fields: { ...a.fields, cidr: "10.0.0.0/8" } };
    const source = directAwsSource(undefined, [a, b]);
    const fixture = { ...input, sources: [source], assessment: { ...input.assessment, evidenceSourceIds: [source.sourceId] } };
    const result = project(fixture);
    expect(result.status).toBe("INCOMPLETE"); expect(result.diagnostics[0].code).toBe("CONFLICTING_ID");
    expect(result.evaluations).toEqual([]);
    const { originalSources: reversedOriginals, ...reversed } = project({ ...fixture, sources: [{ ...source, observations: [b, a] }] });
    const { originalSources, ...conclusions } = result;
    expect(reversed).toEqual(conclusions);
    expect(reversedOriginals[0].observations).toEqual([...originalSources[0].observations].reverse());
  });
  it("cannot create findings from an EC2 resource claiming RDS facts/API", () => {
    const input = northstarBaseline();
    const source = directAwsSource(undefined, [{ ...directObservations[0], api: "DescribeDBInstances", fields: { storageEncrypted: false } }]);
    const result = project({ ...input, sources: [source], assessment: { ...input.assessment, evidenceSourceIds: [source.sourceId] } });
    expect(result.evaluations.every((item) => item.evaluationState === "NOT_APPLICABLE")).toBe(true);
    expect(result.findings).toEqual([]);
  });
  it("empty observations cannot establish PASS", () => {
    const input = northstarBaseline();
    const result = project({ ...input, sources: input.sources.map((source) => ({ ...source, observations: [] })) });
    expect(result.evaluations).toHaveLength(6); expect(result.evaluations.every((item) => item.evaluationState === "UNKNOWN")).toBe(true);
    expect(result.findings).toEqual([]);
  });
  it("keeps explicit scope exclusion and neutral context", () => {
    const input = northstarBaseline();
    const result = runEvidencePipeline(input.assessment, input.sources, { ...input.options, excludedRuleIds: ["SG-001"] }, syntheticAdapters);
    if (!result.success) throw new Error("Expected projection");
    expect(result.projection.evaluations.filter((item) => item.ruleId === "SG-001").every((item) => item.evaluationState === "NOT_EVALUATED")).toBe(true);
    expect(result.projection.findings.some((item) => item.ruleId === "SG-001")).toBe(false);
    expect(baseline.findings.every((item) => item.priorityRationale.includes("production: unavailable (neutral)"))).toBe(true);
  });
});
