import { describe, expect, it } from "vitest";
import { syntheticEvidence } from "../demo/northstar";
import { evaluateRule } from "./evaluate";
import { validateEvidenceObject } from "../schemas/evidence-schema";

const context = { assessmentId: "assessment-northstar-baseline", evaluatedAt: "2026-09-09T01:00:00.000Z", inScope: true };
const run = (ruleId: Parameters<typeof evaluateRule>[0], overrides = {}) => evaluateRule(ruleId, [syntheticEvidence(overrides)], context);

describe("deterministic rule evaluation", () => {
  it("evaluates SG-001 FAIL and PASS without inferring reachability", () => {
    expect(run("SG-001").evaluationState).toBe("FAIL");
    expect(run("SG-001", { observedFields: { protocol: "tcp", fromPort: 22, cidr: "10.0.0.0/8" } }).evaluationState).toBe("PASS");
  });
  it("evaluates SG-002 unrestricted all protocols as FAIL", () => {
    expect(run("SG-002", { observedFields: { protocol: "-1", cidr: "0.0.0.0/0" } }).evaluationState).toBe("FAIL");
  });
  it("keeps S3 incomplete and denied evidence distinct from FAIL", () => {
    expect(run("S3-001", { sourceApi: "GetPublicAccessBlock", completeness: "PARTIAL", observedFields: { publicAccessBlockEnabled: false } }).evaluationState).toBe("PARTIAL_EVIDENCE");
    expect(run("S3-001", { sourceApi: "GetBucketPolicyStatus", retrievalState: "ACCESS_DENIED" }).evaluationState).toBe("ACCESS_DENIED");
  });
  it("evaluates complete S3 policy status only", () => {
    expect(run("S3-001", { sourceApi: "GetBucketPolicyStatus", observedFields: { isPublic: true } }).evaluationState).toBe("FAIL");
    expect(run("S3-001", { sourceApi: "GetBucketPolicyStatus", observedFields: { isPublic: false } }).evaluationState).toBe("PASS");
  });
  it("evaluates RDS configuration without claiming reachability", () => {
    const result = run("RDS-001", { service: "RDS", sourceApi: "DescribeDBInstances", observedFields: { publiclyAccessible: true } });
    expect(result.evaluationState).toBe("FAIL");
    expect(result.rationale).toMatch(/does not establish end-to-end network reachability/i);
    expect(run("RDS-002", { service: "RDS", sourceApi: "DescribeDBInstances", observedFields: { storageEncrypted: false } }).evaluationState).toBe("FAIL");
  });
  it("implements every uncertainty and applicability state deterministically", () => {
    expect(evaluateRule("SG-001", [], context).evaluationState).toBe("UNKNOWN");
    expect(evaluateRule("SG-001", [syntheticEvidence({ assessmentId: "other" })], context).evaluationState).toBe("UNKNOWN");
    expect(evaluateRule("SG-001", [syntheticEvidence({ validationState: "INVALID" })], context).evaluationState).toBe("UNKNOWN");
    expect(evaluateRule("SG-001", [syntheticEvidence({ sourceApi: "GetObject" })], context).evaluationState).toBe("NOT_APPLICABLE");
    expect(evaluateRule("SG-001", [syntheticEvidence()], { ...context, inScope: false }).evaluationState).toBe("NOT_EVALUATED");
  });
});

describe("evidence validation", () => {
  it("accepts bounded hostile strings as data and rejects unsafe prototype-like keys", () => {
    expect(validateEvidenceObject(syntheticEvidence({ resourceName: "<script>alert('x')</script>\n\"quoted\"" })).success).toBe(true);
    const unsafe = syntheticEvidence({ observedFields: JSON.parse('{"__proto__":{"polluted":true}}') });
    expect(validateEvidenceObject(unsafe).success).toBe(false);
  });
  it("rejects malformed evidence", () => {
    expect(validateEvidenceObject({}).success).toBe(false);
    expect(validateEvidenceObject(syntheticEvidence({ resourceId: "x".repeat(10_001) })).success).toBe(false);
  });
});
