import { describe, expect, it } from "vitest";
import type { SourceEnvelope, SyntheticAdapter } from "../src/application/source-contract";
import { evaluateRule } from "../src/domain/evaluate";
import { validateEvidenceObject } from "../src/schemas/evidence-schema";

export function syntheticAdapterContract(adapter: SyntheticAdapter, fixture: () => SourceEnvelope, factsKey: string, resourceKey: string, typeKey: string, apiKey: string) {
  describe(`${adapter.sourceType} bounded source contract`, () => {
    it("preserves metadata, facts and exact stable source association", () => {
      const input = fixture(); const result = adapter.normalize(input);
      expect(result.success).toBe(true);
      if (!result.success) throw new Error("Expected valid source");
      expect(result.diagnostics).toEqual([]);
      expect(result.source).toEqual({ sourceId: input.sourceId, sourceType: input.sourceType, sourceName: input.sourceName,
        sourceVersion: input.sourceVersion, importerVersion: input.importerVersion, collectedAt: input.collectedAt, classification: "SYNTHETIC" });
      for (const evidence of result.evidence) {
        expect(validateEvidenceObject(evidence).success).toBe(true);
        expect(evidence.sourceId).toBe(input.sourceId);
        expect(evidence.assessmentId).toBe(input.assessmentId);
        expect(evidence).not.toHaveProperty("evaluationState");
        expect(evidence).not.toHaveProperty("severity");
        expect(Object.isFrozen(evidence.observedFields)).toBe(true);
      }
      expect(adapter.normalize(input)).toEqual(result);
      expect(adapter.normalize({ ...input, observations: [...input.observations].reverse() })).toEqual(result);
    });
    it.each([
      null, [], {}, { customerData: true }, { customerData: "false" }, { classification: "CUSTOMER DATA" },
      { environment: "PRODUCTION" }, { sourceType: "FUTURE_DIRECT_AWS" }, { sourceType: [adapter.sourceType] },
      { observations: {} }, { observations: Array(257).fill({}) }, { sourceName: "x".repeat(10_001) },
      { sourceVersion: {} }, { collectedAt: "2026-02-30T00:00:00.000Z" }, { extra: true },
    ])("rejects malformed or non-synthetic envelope %j", (override) => {
      const input = override === null || Array.isArray(override) || Object.keys(override).length === 0 ? override : { ...fixture(), ...override };
      expect(adapter.normalize(input).success).toBe(false);
    });
    it.each(["__proto__", "prototype", "constructor"])("rejects %s at nested source boundaries", (key) => {
      const hostile = JSON.parse('{"' + key + '":true}');
      expect(adapter.normalize({ ...fixture(), observations: [hostile] }).success).toBe(false);
    });
    it("rejects source accessors without invoking them", () => {
      let called = false; const source = fixture();
      Object.defineProperty(source, "sourceId", { enumerable: true, get() { called = true; return "spoof"; } });
      expect(adapter.normalize(source).success).toBe(false); expect(called).toBe(false);
    });
    it("rejects excessive nesting, cycles and unexpected objects", () => {
      const deep: Record<string, unknown> = {}; let next = deep;
      for (let i = 0; i < 20_000; i++) { const child = {}; next.child = child; next = child; }
      const cycle: Record<string, unknown> = {}; cycle.self = cycle;
      for (const hostile of [deep, cycle, new Date("2026-09-09T00:00:00.000Z")]) {
        expect(adapter.normalize({ ...fixture(), observations: [hostile] }).success).toBe(false);
      }
    });
    it("retains good observations and reports malformed observations explicitly", () => {
      const input = fixture(); const result = adapter.normalize({ ...input, observations: [...input.observations, { invalid: true }] });
      expect(result.success).toBe(true);
      if (!result.success) throw new Error("Expected diagnostic result");
      expect(result.evidence).toHaveLength(input.observations.length); expect(result.diagnostics).toHaveLength(1);
      expect(result.diagnostics[0].code).toBe("INVALID_OBSERVATION");
    });
    it("rejects boolean strings without coercing them", () => {
      const input = fixture(); const first = input.observations[0] as Record<string, unknown>;
      const result = adapter.normalize({ ...input, observations: [{ ...first, [factsKey]: { storageEncrypted: "false" } }] });
      expect(result.success).toBe(true);
      if (!result.success) throw new Error("Expected diagnostic result");
      expect(result.evidence).toHaveLength(0); expect(result.diagnostics).toHaveLength(1);
    });
    it("cannot normalize observation-level provenance overrides", () => {
      const input = fixture(); const first = input.observations[0] as Record<string, unknown>;
      for (const overrides of [{ assessmentId: "other" }, { sourceId: "other" }]) {
        const result = adapter.normalize({ ...input, observations: [{ ...first, ...overrides }] });
        expect(result.success && result.diagnostics.length).toBe(1);
      }
    });
    it("leaves wrong resource types and spoofed APIs to the hardened applicability check", () => {
      const input = fixture(); const first = input.observations[0] as Record<string, unknown>;
      for (const overrides of [
        { [resourceKey]: { ...first[resourceKey] as object, [typeKey]: "AWS::S3::Bucket" } },
        { [apiKey]: "DescribeDBInstances" },
      ]) {
        const result = adapter.normalize({ ...input, observations: [{ ...first, ...overrides }] });
        if (!result.success) throw new Error("Expected normalized factual data");
        expect(result.diagnostics).toEqual([]);
        expect(evaluateRule("SG-001", result.evidence, { assessmentId: input.assessmentId, evaluatedAt: input.collectedAt }).evaluationState).toBe("NOT_APPLICABLE");
      }
    });
    it("does not share mutable input references", () => {
      const input = structuredClone(fixture()); const result = adapter.normalize(input);
      if (!result.success) throw new Error("Expected source");
      const first = input.observations[0] as Record<string, unknown>;
      (first[factsKey] as Record<string, unknown>).cidr = "10.0.0.0/8";
      const admin = result.evidence.find((item) => item.resourceId === "sg-demo-admin")!;
      expect(admin.observedFields.cidr).toBe("0.0.0.0/0");
    });
    it("marks an absent source version explicitly without overwriting supplied versions", () => {
      const input = { ...fixture() }; delete input.sourceVersion;
      const result = adapter.normalize(input);
      expect(result.success && result.source.sourceVersion).toBe("UNSPECIFIED");
    });
  });
}
