import { describe, expect, it } from "vitest";
import { syntheticAdapterContract } from "../../../test/synthetic-adapter-contract";
import { securityHubObservation, securityHubSource } from "../../demo/fixtures/security-hub";
import { evaluateRule } from "../../domain/evaluate";
import { securityHubAdapter } from "./security-hub-adapter";

syntheticAdapterContract(securityHubAdapter, securityHubSource, "Facts", "Resource", "Type", "CollectionApi");
describe("Security Hub-like trust boundary", () => {
  it.each([
    { Facts: securityHubObservation.Facts, Compliance: { Status: "PASS" }, expected: "FAIL" },
    { Facts: {}, Compliance: { Status: "FAIL" }, expected: "PARTIAL_EVIDENCE" },
  ])("uses raw evidence instead of Compliance.Status: $expected", ({ Facts, Compliance, expected }) => {
    const source = securityHubSource();
    const result = securityHubAdapter.normalize({ ...source, observations: [{ ...securityHubObservation, Facts, Compliance }] });
    if (!result.success) throw new Error("Expected source");
    const evaluation = evaluateRule("SG-001", result.evidence, { assessmentId: source.assessmentId, evaluatedAt: source.collectedAt });
    expect(evaluation.evaluationState).toBe(expected); expect(evaluation.severity).toBe("HIGH");
  });
});
