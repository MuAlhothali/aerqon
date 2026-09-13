import { ruleEvidence } from "../../test/evidence-fixtures";
import { describe, expect, it } from "vitest";
import { syntheticEvidence } from "../demo/northstar";
import { validateEvidenceObject } from "../schemas/evidence-schema";
import { evaluateRule } from "./evaluate";
import type { SupportedRuleId } from "./rules";

const context = { assessmentId: "assessment-northstar-baseline", evaluatedAt: "2026-09-09T01:00:00.000Z", inScope: true };
const apis: Record<SupportedRuleId, string> = {
  "SG-001": "DescribeSecurityGroups", "SG-002": "DescribeSecurityGroups",
  "S3-001": "GetBucketPolicyStatus", "S3-002": "GetEncryptionConfiguration",
  "RDS-001": "DescribeDBInstances", "RDS-002": "DescribeDBInstances",
};

describe("ASTRA confirmed regressions", () => {
  it.each(Object.keys(apis) as SupportedRuleId[])("%s never confirms compliance from empty fields", (ruleId) => {
    const result = evaluateRule(ruleId, [ruleEvidence(ruleId, { sourceApi: apis[ruleId], observedFields: {} })], context);
    expect(["UNKNOWN", "PARTIAL_EVIDENCE"]).toContain(result.evaluationState);
  });

  it.each(["0.0.0.0/0", "::/0"])("detects SSH within a range for %s", (cidr) => {
    expect(evaluateRule("SG-001", [syntheticEvidence({ observedFields: { protocol: "tcp", fromPort: 20, toPort: 30, cidr } })], context).evaluationState).toBe("FAIL");
  });

  it("consumes PAB and policy evidence in either order", () => {
    const pab = ruleEvidence("S3-001", { evidenceId: "pab", sourceApi: "GetPublicAccessBlock", observedFields: { publicAccessBlockEnabled: false } });
    const policy = ruleEvidence("S3-001", { evidenceId: "policy", sourceApi: "GetBucketPolicyStatus", observedFields: { isPublic: true } });
    const forward = evaluateRule("S3-001", [pab, policy], context);
    const reverse = evaluateRule("S3-001", [policy, pab], context);
    expect(forward.evaluationState).toBe("FAIL");
    expect(reverse).toEqual(forward);
  });

  it("isolates validated evidence from caller mutation", () => {
    const observed = { protocol: "tcp", fromPort: 22, cidr: "0.0.0.0/0" };
    const result = validateEvidenceObject(syntheticEvidence({ observedFields: observed }));
    expect(result.success).toBe(true);
    observed.cidr = "10.0.0.0/8";
    if (result.success) expect(result.data.observedFields.cidr).toBe("0.0.0.0/0");
  });

  it("rejects deeply nested structures without a stack overflow", () => {
    const nested: Record<string, unknown> = {};
    let cursor = nested;
    for (let index = 0; index < 20_000; index++) {
      const next = {}; cursor.next = next; cursor = next;
    }
    expect(validateEvidenceObject(syntheticEvidence({ observedFields: nested })).success).toBe(false);
  });
});

describe("uncertainty, completeness and evidence aggregation", () => {
  it.each(Object.keys(apis) as SupportedRuleId[])("%s preserves denied, unavailable, and missing evidence", (id) => {
    const input = ruleEvidence(id, { sourceApi: apis[id], observedFields: {} });
    expect(evaluateRule(id, [{ ...input, retrievalState: "ACCESS_DENIED" }], context).evaluationState).toBe("ACCESS_DENIED");
    expect(evaluateRule(id, [{ ...input, retrievalState: "UNAVAILABLE" }], context).evaluationState).toBe("PARTIAL_EVIDENCE");
    expect(evaluateRule(id, [], context).evaluationState).toBe("UNKNOWN");
  });
  it.each([
    ["RDS-001", "publiclyAccessible"], ["RDS-002", "storageEncrypted"],
    ["S3-001", "isPublic"], ["S3-002", "defaultEncryptionEnabled"],
  ] as const)("%s rejects boolean strings without false PASS", (id, key) => {
    for (const value of ["true", "false"]) {
      expect(evaluateRule(id, [ruleEvidence(id, { sourceApi: apis[id], observedFields: { [key]: value } })], context).evaluationState).toBe("UNKNOWN");
    }
  });
  it.each(["tcp", "TCP", "6", 6])("recognizes equivalent TCP protocol %s", (protocol) => {
    const input = syntheticEvidence({ observedFields: { protocol, fromPort: 20, toPort: 30, cidr: "::/0" } });
    expect(evaluateRule("SG-001", [input], context).evaluationState).toBe("FAIL");
  });
  it.each([
    { fromPort: 22, toPort: 22, expected: "FAIL" },
    { fromPort: 23, toPort: 30, expected: "PASS" },
    { fromPort: 30, toPort: 20, expected: "UNKNOWN" },
    { fromPort: "22", toPort: 22, expected: "UNKNOWN" },
    { fromPort: -1, toPort: 30, expected: "UNKNOWN" },
    { fromPort: 20, toPort: 65536, expected: "UNKNOWN" },
  ])("validates SSH port interval %j", ({ fromPort, toPort, expected }) => {
    const input = syntheticEvidence({ observedFields: { protocol: "tcp", fromPort, toPort, cidr: "0.0.0.0/0" } });
    expect(evaluateRule("SG-001", [input], context).evaluationState).toBe(expected);
  });
  it.each(["", "broken", "0.0.0.0/99", "999.0.0.0/0", ":::/0", "2001:bad/64"])("does not treat malformed CIDR %s as restricted", (cidr) => {
    expect(evaluateRule("SG-001", [syntheticEvidence({ observedFields: { protocol: "tcp", fromPort: 22, cidr } })], context).evaluationState).toBe("UNKNOWN");
  });
  it("checks all ingress observations, even when a compliant one is first", () => {
    const restricted = syntheticEvidence({ evidenceId: "a", observedFields: { protocol: "tcp", fromPort: 22, cidr: "10.0.0.0/8" } });
    const exposed = syntheticEvidence({ evidenceId: "b" });
    const result = evaluateRule("SG-001", [restricted, exposed], context);
    expect(result.evaluationState).toBe("FAIL");
    expect(evaluateRule("SG-001", [exposed, restricted], context)).toEqual(result);
    expect(evaluateRule("SG-001", [exposed, { ...restricted, observedFields: {} }], context).evaluationState).toBe("PARTIAL_EVIDENCE");
  });
  it("does not infer S3 public status from PAB alone or missing PAB", () => {
    const pab = ruleEvidence("S3-001", { sourceApi: "GetPublicAccessBlock", observedFields: { publicAccessBlockEnabled: false } });
    const policy = ruleEvidence("S3-001", { sourceApi: "GetBucketPolicyStatus", observedFields: { isPublic: true } });
    expect(evaluateRule("S3-001", [pab], context).evaluationState).toBe("PARTIAL_EVIDENCE");
    expect(evaluateRule("S3-001", [policy], context).evaluationState).toBe("PARTIAL_EVIDENCE");
  });
  it("rejects inconsistent S3 observations in either order", () => {
    const pab = ruleEvidence("S3-001", { evidenceId: "pab", sourceApi: "GetPublicAccessBlock", observedFields: { publicAccessBlockEnabled: false } });
    const a = ruleEvidence("S3-001", { evidenceId: "a", sourceApi: "GetBucketPolicyStatus", observedFields: { isPublic: true } });
    const b = ruleEvidence("S3-001", { evidenceId: "b", sourceApi: "GetBucketPolicyStatus", observedFields: { isPublic: false } });
    expect(evaluateRule("S3-001", [pab, a, b], context).evaluationState).toBe("UNKNOWN");
    expect(evaluateRule("S3-001", [b, a, pab], context)).toEqual(evaluateRule("S3-001", [pab, a, b], context));
    expect(evaluateRule("S3-001", [{ ...pab, observedFields: { publicAccessBlockEnabled: true } }, a], context).evaluationState).toBe("UNKNOWN");
  });
  it.each([
    ["S3-002", "defaultEncryptionEnabled", true, "PASS"], ["S3-002", "defaultEncryptionEnabled", false, "FAIL"],
    ["RDS-001", "publiclyAccessible", false, "PASS"], ["RDS-001", "publiclyAccessible", true, "FAIL"],
    ["RDS-002", "storageEncrypted", true, "PASS"], ["RDS-002", "storageEncrypted", false, "FAIL"],
  ] as const)("%s %s=%s returns %s only with explicit evidence", (id, field, value, expected) => {
    expect(evaluateRule(id, [ruleEvidence(id, { sourceApi: apis[id], observedFields: { [field]: value } })], context).evaluationState).toBe(expected);
  });
  it("rejects contradictory scalar evidence rather than selecting a first value", () => {
    const a = ruleEvidence("RDS-002", { evidenceId: "a", sourceApi: "DescribeDBInstances", observedFields: { storageEncrypted: true } });
    const b = { ...a, evidenceId: "b", observedFields: { storageEncrypted: false } };
    expect(evaluateRule("RDS-002", [a, b], context).evaluationState).toBe("UNKNOWN");
    expect(evaluateRule("RDS-002", [b, a], context)).toEqual(evaluateRule("RDS-002", [a, b], context));
  });
  it("deduplicates identical evidence and rejects conflicting reuse of IDs", () => {
    const input = syntheticEvidence();
    expect(evaluateRule("SG-001", [input, input], context)).toEqual(evaluateRule("SG-001", [input], context));
    const conflict = { ...input, observedFields: { protocol: "tcp", fromPort: 23, cidr: "0.0.0.0/0" } };
    expect(evaluateRule("SG-001", [input, conflict], context).evaluationState).toBe("UNKNOWN");
  });
  it("rejects mixed resources and assessments before evaluation", () => {
    for (const overrides of [{ resourceId: "other" }, { assessmentId: "other" }, { region: "other" }, { accountPlaceholder: "other" }]) {
      const a = syntheticEvidence({ evidenceId: "a" });
      const b = syntheticEvidence({ evidenceId: "b", ...overrides });
      expect(evaluateRule("SG-001", [a, b], context).evaluationState).toBe("UNKNOWN");
    }
  });
  it("handles malformed values at the evaluator entry point and default scope", () => {
    for (const input of [null, [], "invalid", { observedFields: {} }]) {
      expect(evaluateRule("SG-001", [input], context).evaluationState).toBe("UNKNOWN");
    }
    expect(evaluateRule("SG-001", [syntheticEvidence()], { assessmentId: context.assessmentId, evaluatedAt: context.evaluatedAt }).evaluationState).toBe("FAIL");
  });
  it("does not evaluate observations collected after the evaluation timestamp", () => {
    expect(evaluateRule("SG-001", [syntheticEvidence({ observedAt: "2026-09-10T00:00:00.000Z" })], context).evaluationState).toBe("UNKNOWN");
  });
});
