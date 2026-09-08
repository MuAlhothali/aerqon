import { describe, expect, it } from "vitest";
import { prioritize } from "../application/prioritize";
import { syntheticEvidence } from "../demo/northstar";
import { evaluateRule } from "./evaluate";
import { generateFinding } from "./findings";
import { recordCustomerReportedRemediation, verifyResolution } from "./remediation";
import { ruleDefinitions } from "./rules";

const context = { assessmentId: "assessment-northstar-baseline", evaluatedAt: "2026-09-09T01:00:00.000Z", inScope: true };

describe("finding and remediation invariants", () => {
  it("creates active findings only from FAIL", () => {
    const evidence = syntheticEvidence();
    const fail = evaluateRule("SG-001", [evidence], context);
    const finding = generateFinding(fail, ruleDefinitions["SG-001"], evidence, context.evaluatedAt);
    expect(finding.kind).toBe("ACTIVE_FINDING");
    const partial = evaluateRule("S3-001", [syntheticEvidence({ sourceApi: "GetPublicAccessBlock", completeness: "PARTIAL" })], context);
    expect(generateFinding(partial, ruleDefinitions["S3-001"], evidence, context.evaluatedAt).kind).toBe("EVIDENCE_REVIEW");
  });
  it("does not resolve a finding merely because a customer reported remediation", () => {
    const evidence = syntheticEvidence(); const evaluation = evaluateRule("SG-001", [evidence], context); const generated = generateFinding(evaluation, ruleDefinitions["SG-001"], evidence, context.evaluatedAt);
    if (generated.kind !== "ACTIVE_FINDING") throw new Error("Expected finding");
    const action = recordCustomerReportedRemediation({ actionId: "a1", findingId: generated.finding.findingId, owner: "Customer", status: "IN_PROGRESS", actionDescription: "Restrict ingress", verificationCondition: "Recheck", notes: "" }, context.evaluatedAt, "fixed");
    expect(action.customerReportedAt).toBe(context.evaluatedAt);
    expect(generated.finding.remediationState).toBe("OPEN");
    expect(verifyResolution(generated.finding, false, context.evaluatedAt).remediationState).toBe("OPEN");
  });
  it("uses deterministic priority bands without a numeric risk score", () => {
    const high = prioritize({ evaluationState: "FAIL", severity: "HIGH", confidence: "HIGH", production: true, externallyRelevant: true, commercialTriggerRelevant: false, remediationFeasible: true, stableKey: "a" });
    const low = prioritize({ evaluationState: "FAIL", severity: "LOW", confidence: "LOW", production: false, externallyRelevant: false, commercialTriggerRelevant: false, remediationFeasible: false, stableKey: "z" });
    expect(high.band).toBe("P0"); expect(low.band).toBe("P3"); expect(high.sortKey).toEqual(prioritize({ evaluationState: "FAIL", severity: "HIGH", confidence: "HIGH", production: true, externallyRelevant: true, commercialTriggerRelevant: false, remediationFeasible: true, stableKey: "a" }).sortKey);
  });
});
