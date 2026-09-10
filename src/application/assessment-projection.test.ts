import { describe, expect, it } from "vitest";
import { runNorthstarPrototype, syntheticAdapters } from "../demo/evidence-prototype";
import { northstarBaseline } from "../demo/fixtures/northstar-baseline";
import { ruleDefinitions } from "../domain/rules";
import { projectCoverage } from "./assessment-projection";
import { runEvidencePipeline } from "./evidence-pipeline";

describe("assessment read model", () => {
  it("projects actual coverage counts and only confirmed findings", () => {
    const result = runNorthstarPrototype();
    if (!result.success) throw new Error("Expected prototype");
    const p = result.projection;
    expect(p.coverage).toEqual({ counts: { PASS: 8, FAIL: 6, UNKNOWN: 0, PARTIAL_EVIDENCE: 0, ACCESS_DENIED: 1, NOT_EVALUATED: 0, NOT_APPLICABLE: 39 }, total: 54, validationFailures: 0 });
    expect(p.findings).toHaveLength(p.coverage.counts.FAIL);
    expect(p.classification).toBe("DEMO DATA"); expect(p.environment).toBe("SYNTHETIC ENVIRONMENT"); expect(p.customerData).toBe(false);
    expect(p.sourceManifest.map((item) => item.sourceId)).toEqual(["northstar-direct", "northstar-prowler", "northstar-security-hub"]);
    expect(p.ruleManifest).toHaveLength(6);
    for (const rule of p.ruleManifest) {
      expect(rule.version).toBe("1.2.0");
      expect(rule.requiredEvidence).toEqual(ruleDefinitions[rule.ruleId as keyof typeof ruleDefinitions].requiredEvidence);
      expect(rule.applicableResourceType).toBe(ruleDefinitions[rule.ruleId as keyof typeof ruleDefinitions].applicableResourceType);
    }
    for (const forbidden of ["score", "riskScore", "healthScore", "compliancePercentage", "savings", "ROI"]) expect(p).not.toHaveProperty(forbidden);
    expect(new Set(p.prioritizedFindings.map((item) => item.findingId))).toEqual(new Set(p.findings.map((item) => item.findingId)));
  });
  it("provides all seven explicit coverage states even without evaluations", () => {
    expect(projectCoverage([])).toEqual({ counts: { PASS: 0, FAIL: 0, UNKNOWN: 0, NOT_EVALUATED: 0, ACCESS_DENIED: 0, PARTIAL_EVIDENCE: 0, NOT_APPLICABLE: 0 }, total: 0, validationFailures: 0 });
  });
  it("isolates assessment, source manifests and evidence from caller mutation", () => {
    const input = structuredClone(northstarBaseline());
    const result = runEvidencePipeline(input.assessment, input.sources, input.options, syntheticAdapters);
    if (!result.success) throw new Error("Expected prototype");
    input.assessment.regions = ["wrong"]; input.assessment.evidenceSourceIds.length = 0;
    input.sources[0] = { ...input.sources[0], sourceName: "changed" };
    expect(result.projection.assessment.regions).toContain("us-east-1");
    expect(result.projection.assessment.evidenceSourceIds).toHaveLength(3);
    expect(result.projection.sourceManifest[0].sourceName).not.toBe("changed");
    expect(Object.isFrozen(result.projection.evidence[0].observedFields)).toBe(true);
  });
  it.each([
    { classification: "CUSTOMER" }, { environmentName: "PRODUCTION" }, { status: ["COMPLETE"] },
    { assessmentDate: "not-a-date" }, { regions: "us-east-1" }, { evidenceSourceIds: ["duplicate", "duplicate"] },
  ])("rejects invalid assessment metadata %j", (override) => {
    const input = northstarBaseline();
    expect(runEvidencePipeline({ ...input.assessment, ...override }, input.sources, input.options, syntheticAdapters).success).toBe(false);
  });
  it("requires explicit valid time and validates optional trusted priority facts", () => {
    const input = northstarBaseline();
    for (const generatedAt of ["", "yesterday", "2026-09-08T00:00:00.000Z"]) {
      expect(runEvidencePipeline(input.assessment, input.sources, { generatedAt }, syntheticAdapters).success).toBe(false);
    }
    const result = runEvidencePipeline(input.assessment, input.sources, { ...input.options, priorityContext: { production: true } }, syntheticAdapters);
    if (!result.success) throw new Error("Expected known context");
    expect(result.projection.findings[0].priorityRationale).toContain("production: true");
    expect(result.projection.findings[0].priorityRationale).toContain("remediation feasibility: unavailable (neutral)");
  });
});
