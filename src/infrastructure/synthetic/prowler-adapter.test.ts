import { describe, expect, it } from "vitest";
import { syntheticAdapterContract } from "../../../test/synthetic-adapter-contract";
import { prowlerObservation, prowlerSource } from "../../demo/fixtures/prowler";
import { evaluateRule } from "../../domain/evaluate";
import { prowlerAdapter } from "./prowler-adapter";

syntheticAdapterContract(prowlerAdapter, prowlerSource, "facts", "resource", "type", "collection");
describe("Prowler-like trust boundary", () => {
  it.each([
    { facts: prowlerObservation.facts, Status: "PASS", expected: "FAIL" },
    { facts: {}, Status: "FAIL", expected: "PARTIAL_EVIDENCE" },
  ])("uses raw evidence instead of Status: $expected", ({ facts, Status, expected }) => {
    const source = prowlerSource();
    const result = prowlerAdapter.normalize({ ...source, observations: [{ ...prowlerObservation, facts, Status }] });
    if (!result.success) throw new Error("Expected source");
    const evaluation = evaluateRule("SG-001", result.evidence, { assessmentId: source.assessmentId, evaluatedAt: source.collectedAt });
    expect(evaluation.evaluationState).toBe(expected); expect(evaluation.severity).toBe("HIGH");
  });
});
