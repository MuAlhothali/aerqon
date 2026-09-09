import { describe, expect, it } from "vitest";
import { ruleEvidence } from "../../test/evidence-fixtures";
import { evaluateRule, verifyEvaluation } from "./evaluate";
import { generateFinding } from "./findings";
import { verifyResolution } from "./remediation";
import { ruleDefinitions, type SupportedRuleId } from "./rules";
import type { EvidenceObject } from "./types";

const time = "2026-09-09T01:00:00.000Z";
const fresh = "2026-09-09T02:00:00.000Z";
const context = { assessmentId: "assessment-northstar-baseline", evaluatedAt: time };
const ids = Object.keys(ruleDefinitions) as SupportedRuleId[];
const observations: Record<SupportedRuleId, Record<string, unknown>> = {
  "SG-001": { protocol: "tcp", fromPort: 22, cidr: "0.0.0.0/0" },
  "SG-002": { protocol: "-1", cidr: "::/0" },
  "S3-001": { publicAccessBlockEnabled: false },
  "S3-002": { defaultEncryptionEnabled: false },
  "RDS-001": { publiclyAccessible: true },
  "RDS-002": { storageEncrypted: false },
};
function inputs(id: SupportedRuleId) {
  const primary = ruleEvidence(id, { evidenceId: "a", sourceApi: ruleDefinitions[id].requiredEvidence[0], observedFields: observations[id] });
  return id === "S3-001" ? [primary, { ...primary, evidenceId: "b", sourceApi: "GetBucketPolicyStatus", observedFields: { isPublic: true } }] : [primary];
}

describe("rule applicability contract", () => {
  it.each(ids)("%s retains valid conclusions and rejects each incompatible dimension", (id) => {
    const valid = inputs(id);
    expect(evaluateRule(id, valid, context).evaluationState).toBe("FAIL");
    for (const override of [{ service: "wrong" }, { resourceType: "wrong" }, { sourceApi: "wrong" }]) {
      const incompatible = valid.map((item) => ({ ...item, ...override }));
      const result = evaluateRule(id, incompatible, context);
      expect(result.evaluationState).toBe("NOT_APPLICABLE");
      expect(result.findingEligible).toBe(false);
      expect(generateFinding(result, incompatible, time).kind).toBe("NONE");
      expect(generateFinding({ ...result, evaluationState: "FAIL", findingEligible: true }, incompatible, time).kind).toBe("REJECTED");
      expect(evaluateRule(id, [...incompatible].reverse(), context)).toEqual(result);
    }
  });
  it.each([
    ["RDS-002", "SG-001", "DescribeDBInstances", { storageEncrypted: false }],
    ["SG-001", "S3-001", "DescribeSecurityGroups", observations["SG-001"]],
    ["S3-002", "RDS-001", "GetEncryptionConfiguration", { defaultEncryptionEnabled: false }],
  ] as const)("%s rejects spoofed API on %s resources", (target, resourceRule, sourceApi, observedFields) => {
    const evidence = [ruleEvidence(resourceRule, { sourceApi, observedFields })];
    const result = evaluateRule(target, evidence, context);
    expect(result.evaluationState).toBe("NOT_APPLICABLE");
    expect(generateFinding(result, evidence, time).kind).toBe("NONE");
  });
  it("preserves mixed-resource uncertainty in either order", () => {
    const evidence = [...inputs("SG-001"), ruleEvidence("S3-001", { evidenceId: "other" })];
    const result = evaluateRule("SG-001", evidence, context);
    expect(result.evaluationState).toBe("UNKNOWN");
    expect(result.diagnosticCode).toBe("MIXED_RESOURCES");
    expect(evaluateRule("SG-001", [...evidence].reverse(), context)).toEqual(result);
  });
  it("ignores unrelated APIs without treating their fields as rule evidence", () => {
    const evidence = [...inputs("SG-001"), ruleEvidence("SG-001", { evidenceId: "other", sourceApi: "DescribeDBInstances", observedFields: {} })];
    const result = evaluateRule("SG-001", evidence, context);
    expect(result.evaluationState).toBe("FAIL");
    expect(result.evidenceIds).toEqual(["a"]);
    expect(evaluateRule("SG-001", [...evidence].reverse(), context)).toEqual(result);
  });
  it.each(ids)("%s publishes the corrected version without accepting historical proof", (id) => {
    const evidence = inputs(id);
    const result = evaluateRule(id, evidence, context);
    expect(result.ruleVersion).toBe("1.2.0");
    for (const ruleVersion of ["1.0.0", "1.1.0"]) expect(verifyEvaluation({ ...result, ruleVersion }, evidence)).toBe(false);
  });
});

const original = [
  ruleEvidence("SG-001", { evidenceId: "evidence-A", sourceId: "source-A" }),
  ruleEvidence("SG-001", { evidenceId: "evidence-B", sourceId: "source-B" }),
];
const evaluation = evaluateRule("SG-001", original, context);
const swap = (evidence: EvidenceObject[]) => evidence.map((item, index) => ({ ...item, sourceId: evidence[1 - index].sourceId }));

describe("canonical evidence-source bindings", () => {
  it("verifies original bindings by value, deterministically and deeply frozen", () => {
    expect(evaluation.evidenceBindings).toEqual([
      { evidenceId: "evidence-A", sourceId: "source-A" }, { evidenceId: "evidence-B", sourceId: "source-B" },
    ]);
    expect(verifyEvaluation(JSON.parse(JSON.stringify(evaluation)), original)).toBe(true);
    expect(evaluateRule("SG-001", [...original].reverse(), context)).toEqual(evaluation);
    expect(Object.isFrozen(evaluation.evidenceBindings)).toBe(true);
    expect(evaluation.evidenceBindings.every(Object.isFrozen)).toBe(true);
    expect(evaluation.evidenceIds).toEqual(evaluation.evidenceBindings.map((pair) => pair.evidenceId));
    expect(generateFinding(evaluation, original, time).kind).toBe("ACTIVE_FINDING");
  });
  it("rejects source swapping even when both ID sets are unchanged", () => {
    const swapped = swap(original);
    const replay = evaluateRule("SG-001", swapped, context);
    expect(replay.evidenceIds).toEqual(evaluation.evidenceIds);
    expect(replay.sourceIds).toEqual(evaluation.sourceIds);
    expect(replay.evaluationId).not.toBe(evaluation.evaluationId);
    expect(verifyEvaluation(evaluation, swapped)).toBe(false);
    expect(generateFinding(evaluation, swapped, time).kind).toBe("REJECTED");
  });
  it.each([
    [evaluation.evidenceBindings[0]],
    [...evaluation.evidenceBindings, evaluation.evidenceBindings[0]],
    [...evaluation.evidenceBindings, { evidenceId: "extra", sourceId: "unrelated" }],
    [...evaluation.evidenceBindings].reverse(),
    evaluation.evidenceBindings.map((pair, index) => ({ ...pair, sourceId: evaluation.evidenceBindings[1 - index].sourceId })),
  ])("rejects missing, duplicate, extra, reordered or swapped proof bindings: %j", (...evidenceBindings) => {
    const altered = { ...evaluation, evidenceBindings };
    expect(verifyEvaluation(altered, original)).toBe(false);
    expect(generateFinding(altered, original, time).kind).toBe("REJECTED");
  });
  it("normalizes duplicate input pairs and supports multiple evidence IDs from one source", () => {
    expect(evaluateRule("SG-001", [...original, ...original], context)).toEqual(evaluation);
    const shared = original.map((item) => ({ ...item, sourceId: "shared" }));
    const result = evaluateRule("SG-001", shared, context);
    expect(result.evidenceBindings).toHaveLength(2);
    expect(result.sourceIds).toEqual(["shared"]);
    expect(verifyEvaluation(result, shared)).toBe(true);
  });
  it("rejects conflicting evidence IDs with different source bindings", () => {
    const result = evaluateRule("SG-001", [original[0], { ...original[0], sourceId: "other" }], context);
    expect(result.evaluationState).toBe("UNKNOWN");
    expect(result.diagnosticCode).toBe("CONFLICTING_EVIDENCE_ID");
  });
  it("rejects missing canonical structure and contradictory compatibility fields", () => {
    const { evidenceBindings: omitted, ...legacy } = evaluation;
    expect(omitted).toHaveLength(2);
    expect(verifyEvaluation(legacy as typeof evaluation, original)).toBe(false);
    expect(verifyEvaluation({ ...evaluation, sourceIds: ["other"] }, original)).toBe(false);
    expect(verifyEvaluation({ ...evaluation, evidenceIds: [] }, original)).toBe(false);
  });
  it("resolves matching fresh PASS but rejects source-swapped PASS", () => {
    const generated = generateFinding(evaluation, original, time);
    if (generated.kind !== "ACTIVE_FINDING") throw new Error("Expected finding");
    const evidence = original.map((item) => ({ ...item, observedAt: fresh, observedFields: { protocol: "tcp", fromPort: 22, cidr: "10.0.0.0/8" } }));
    const pass = evaluateRule("SG-001", evidence, { ...context, evaluatedAt: fresh });
    expect(pass.evaluationState).toBe("PASS");
    expect(verifyResolution(generated.finding, { evaluation: pass, evidence }, fresh).remediationState).toBe("RESOLVED");
    expect(verifyResolution(generated.finding, { evaluation: pass, evidence: swap(evidence) }, fresh)).toBe(generated.finding);
    expect(verifyResolution(generated.finding, { evaluation: { ...pass, evidenceBindings: pass.evidenceBindings.slice(1) }, evidence }, fresh)).toBe(generated.finding);
  });
});
