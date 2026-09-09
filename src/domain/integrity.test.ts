import { describe, expect, it } from "vitest";
import { syntheticEvidence } from "../demo/northstar";
import { evaluateRule } from "./evaluate";
import { generateFinding } from "./findings";
import { comparePriorities, prioritize, sortFindings } from "./prioritize";
import { recordCustomerReportedRemediation, verifyResolution } from "./remediation";
import { ruleDefinitions } from "./rules";
import type { EvidenceObject, Finding, RuleEvaluation } from "./types";

const time = "2026-09-09T01:00:00.000Z";
const recheckTime = "2026-09-09T02:00:00.000Z";
const context = { assessmentId: "assessment-northstar-baseline", evaluatedAt: time, inScope: true };
const original = syntheticEvidence();
const baseline = evaluateRule("SG-001", [original], context);
function finding(): Finding {
  const result = generateFinding(baseline, [original], time);
  if (result.kind !== "ACTIVE_FINDING") throw new Error("Expected active finding.");
  return result.finding;
}
function proof(overrides: Partial<EvidenceObject> = {}) {
  const evidence = syntheticEvidence({ evidenceId: "recheck-evidence", observedAt: recheckTime,
    observedFields: { protocol: "tcp", fromPort: 22, cidr: "10.0.0.0/8" }, ...overrides });
  return { evidence: [evidence], evaluation: evaluateRule("SG-001", [evidence], { ...context, evaluatedAt: recheckTime }) };
}

describe("finding integrity", () => {
  it.each([
    { assessmentId: "other-assessment" }, { resourceId: "other-resource" }, { sourceId: "other-source" },
    { region: "eu-west-1" }, { accountPlaceholder: "other-account" }, { evidenceId: "not-referenced" },
  ])("rejects unrelated evidence: %j", (overrides) => {
    expect(generateFinding(baseline, [syntheticEvidence(overrides)], time).kind).toBe("REJECTED");
  });
  it.each([
    { ruleId: "RDS-002" }, { ruleVersion: "0.0.0" }, { assessmentId: "other" },
    { severity: "LOW" as const }, { confidence: "LOW" as const }, { evidenceIds: [] },
  ])("rejects a mismatched or altered evaluation: %j", (change) => {
    expect(generateFinding({ ...baseline, ...change }, [original], time).kind).toBe("REJECTED");
  });
  it("rejects edited observed fields even with the original evidence ID", () => {
    expect(generateFinding(baseline, [syntheticEvidence({ observedFields: {} })], time).kind).toBe("REJECTED");
  });
  it("derives definitions internally and reports eligibility truthfully", () => {
    expect(baseline.findingEligible).toBe(true);
    expect(baseline).not.toHaveProperty("findingCreated");
    expect(finding().ruleVersion).toBe(ruleDefinitions["SG-001"].version);
    expect(finding().title).toBe(ruleDefinitions["SG-001"].title);
    expect(Object.isFrozen(baseline)).toBe(true);
  });
  it("does not assume production or feasibility when context is absent", () => {
    const result = finding();
    expect(result.priorityRationale).toContain("production: unavailable (neutral)");
    expect(result.priorityRationale).toContain("remediation feasibility: unavailable (neutral)");
    const explicit = generateFinding(baseline, [original], time, { production: true, externallyRelevant: true, remediationFeasible: true });
    expect(explicit.kind).toBe("ACTIVE_FINDING");
    if (explicit.kind === "ACTIVE_FINDING") {
      expect(explicit.finding.priorityRationale).toContain("production: true");
      expect(explicit.finding.priorityBand).toBe("P0");
    }
    expect(result.priorityBand).toBe("P2");
  });
});

describe("verified resolution", () => {
  it("rejects a naked boolean at runtime and at the TypeScript boundary", () => {
    const open = finding();
    // @ts-expect-error A boolean is not evidence-backed verification.
    expect(verifyResolution(open, true, recheckTime)).toBe(open);
  });
  it("retains customer reports without establishing resolution", () => {
    const open = finding();
    const action = recordCustomerReportedRemediation({ actionId: "action", findingId: open.findingId,
      owner: "customer", status: "IN_PROGRESS", actionDescription: "restrict SSH", verificationCondition: "re-evaluate", notes: "" }, recheckTime, "<script>fixed</script>\n\"done\"");
    expect(action.status).toBe("IN_PROGRESS");
    expect(action.notes).toContain("<script>");
    expect(open.remediationState).toBe("OPEN");
  });
  it("resolves only a matching re-evaluated PASS with fresh evidence", () => {
    const open = finding();
    const verification = proof();
    const resolved = verifyResolution(open, verification, recheckTime);
    expect(resolved.remediationState).toBe("RESOLVED");
    expect(resolved.evaluationState).toBe("PASS");
    expect(resolved.evaluationId).toBe(verification.evaluation.evaluationId);
    expect(resolved.resolvedAt).toBe(recheckTime);
    expect(open.remediationState).toBe("OPEN");
  });
  it.each([
    { observedFields: {} }, { retrievalState: "ACCESS_DENIED" as const },
    { completeness: "PARTIAL" as const }, { observedFields: { protocol: "tcp", fromPort: 22, cidr: "0.0.0.0/0" } },
  ])("cannot resolve non-PASS verification: %j", (overrides) => {
    const open = { ...finding(), remediationState: "IN_PROGRESS" as const };
    expect(verifyResolution(open, proof(overrides), recheckTime)).toBe(open);
  });
  it.each([
    { assessmentId: "other" }, { resourceId: "other-resource" }, { region: "eu-west-1" },
    { accountPlaceholder: "other-account" }, { observedAt: "2026-09-09T00:00:00.000Z" },
  ])("rejects mismatched lineage or stale observations: %j", (overrides) => {
    const open = finding();
    expect(verifyResolution(open, proof(overrides), recheckTime)).toBe(open);
  });
  it("rejects a genuine PASS from a different assessment", () => {
    const wrong = proof({ assessmentId: "other" });
    wrong.evaluation = evaluateRule("SG-001", wrong.evidence, { ...context, assessmentId: "other", evaluatedAt: recheckTime });
    expect(wrong.evaluation.evaluationState).toBe("PASS");
    const open = finding();
    expect(verifyResolution(open, wrong, recheckTime)).toBe(open);
  });
  it("rejects a genuine PASS for a different rule", () => {
    const wrong = proof();
    wrong.evaluation = evaluateRule("SG-002", wrong.evidence, { ...context, evaluatedAt: recheckTime });
    expect(wrong.evaluation.evaluationState).toBe("PASS");
    const open = finding();
    expect(verifyResolution(open, wrong, recheckTime)).toBe(open);
  });
  it("rejects fabricated PASS metadata and invalid chronology", () => {
    const open = finding();
    const fake = { evaluation: { ...baseline, evaluationState: "PASS" as const }, evidence: [original] };
    expect(verifyResolution(open, fake, recheckTime)).toBe(open);
    expect(verifyResolution(open, proof(), time)).toBe(open);
    const invalid = proof({ validationState: "INVALID" });
    expect(invalid.evaluation.evaluationState).toBe("UNKNOWN");
    expect(verifyResolution(open, invalid, recheckTime)).toBe(open);
  });
});

describe("stable priorities and domain boundaries", () => {
  it("sorts equal priority findings by real stable dimensions without mutating input", () => {
    const a = { ...finding(), findingId: "a" };
    const b = { ...a, findingId: "b" };
    const c = { ...a, findingId: "c", resourceId: "zz" };
    const input = [c, b, a];
    expect(sortFindings(input).map((item) => item.findingId)).toEqual(["a", "b", "c"]);
    expect(sortFindings([...input].reverse())).toEqual(sortFindings(input));
    expect(sortFindings(sortFindings(input))).toEqual(sortFindings(input));
    expect(input).toEqual([c, b, a]);
  });
  it("breaks equal dimension priority ties and ranks uncertainty below failure", () => {
    const input = { evaluationState: "FAIL" as const, severity: "HIGH" as const, confidence: "HIGH" as const };
    const a = prioritize({ ...input, stableKey: "a" });
    const b = prioritize({ ...input, stableKey: "b" });
    const unknown = prioritize({ ...input, evaluationState: "UNKNOWN", stableKey: "0" });
    expect([b, unknown, a].sort(comparePriorities)).toEqual([a, b, unknown]);
    expect(a).not.toHaveProperty("score");
  });
  it("retains separate severity and confidence dimensions", () => {
    const lowConfidence = evaluateRule("SG-001", [syntheticEvidence({ completeness: "PARTIAL" })], context);
    expect(lowConfidence.severity).toBe("HIGH");
    expect(lowConfidence.confidence).toBe("LOW");
  });
  it("keeps rule versions immutable and rejects superseded verification semantics", () => {
    expect(ruleDefinitions["SG-001"].version).toBe("1.2.0");
    expect(Object.isFrozen(ruleDefinitions["SG-001"])).toBe(true);
    const old: RuleEvaluation = { ...baseline, ruleVersion: "1.0.0" };
    expect(generateFinding(old, [original], time).kind).toBe("REJECTED");
  });
});
