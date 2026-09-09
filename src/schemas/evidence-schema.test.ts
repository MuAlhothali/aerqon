import { describe, expect, it } from "vitest";
import { syntheticEvidence } from "../demo/northstar";
import { evidenceLimits, validateEvidenceObject } from "./evidence-schema";

describe("bounded evidence boundary", () => {
  it.each(["__proto__", "prototype", "constructor"])("rejects %s at all relevant object levels", (key) => {
    const input = syntheticEvidence();
    const withKey = JSON.parse(JSON.stringify(input));
    Object.defineProperty(withKey, key, { value: {}, enumerable: true });
    expect(validateEvidenceObject(withKey).success).toBe(false);
    const nested = JSON.parse('{"' + key + '":{}}');
    expect(validateEvidenceObject(syntheticEvidence({ observedFields: { nested } })).success).toBe(false);
    expect(validateEvidenceObject(syntheticEvidence({ observedFields: { nested: [nested] } })).success).toBe(false);
    expect(Object.prototype).not.toHaveProperty("polluted");
  });
  it.each(["resourceName", "resourceId", "observedFields", "limitations", "expectedFields"])("bounds long strings in %s", (key) => {
    const long = "x".repeat(evidenceLimits.string + 1);
    const input = { ...syntheticEvidence(), [key]: key === "observedFields" ? { notes: long } : key === "limitations" || key === "expectedFields" ? [long] : long };
    expect(validateEvidenceObject(input).success).toBe(false);
  });
  it("bounds arrays, key counts, total text and total node count", () => {
    const array = Array(evidenceLimits.array + 1).fill("x");
    const keys = Object.fromEntries(Array.from({ length: evidenceLimits.keys + 1 }, (_, index) => [String(index), true]));
    const text = Array(11).fill("x".repeat(10_000));
    const nodes = Array.from({ length: 128 }, () => Array(128).fill(null));
    for (const fields of [{ array }, keys, { text }, { nodes }]) {
      expect(validateEvidenceObject(syntheticEvidence({ observedFields: fields })).success).toBe(false);
    }
  });
  it("rejects cycles, non-JSON objects and sparse arrays safely", () => {
    const cyclic: Record<string, unknown> = {}; cyclic.self = cyclic;
    for (const fields of [cyclic, { value: new Date("2026-09-09T00:00:00.000Z") }, { value: new Array(2) }, { value: Infinity }, { value: () => true }]) {
      expect(validateEvidenceObject(syntheticEvidence({ observedFields: fields })).success).toBe(false);
    }
  });
  it("does not invoke input getters", () => {
    let executed = false;
    const observed = Object.defineProperty({}, "value", { enumerable: true, get() { executed = true; throw new Error("Should not run"); } });
    expect(validateEvidenceObject(syntheticEvidence({ observedFields: observed })).success).toBe(false);
    expect(executed).toBe(false);
  });
  it("rejects unknown root properties, invalid enums and invalid timestamps", () => {
    const invalid = [
      { unexpected: true }, { completeness: "true" }, { completeness: { toString: () => "COMPLETE" } },
      { retrievalState: "DENIED" }, { validationState: "UNKNOWN" }, { observedAt: "2026-02-30T00:00:00.000Z" },
    ];
    for (const change of invalid) expect(validateEvidenceObject({ ...syntheticEvidence(), ...change }).success).toBe(false);
  });
  it.each(["publicAccessBlockEnabled", "isPublic", "defaultEncryptionEnabled", "publiclyAccessible", "storageEncrypted"])("requires actual booleans for %s", (key) => {
    for (const value of ["true", "false", 0, 1, null, [], {}]) {
      expect(validateEvidenceObject(syntheticEvidence({ observedFields: { [key]: value } })).success).toBe(false);
    }
    for (const value of [true, false]) expect(validateEvidenceObject(syntheticEvidence({ observedFields: { [key]: value } })).success).toBe(true);
  });
  it("copies and freezes nested arrays, fields, and metadata; hostile strings stay data", () => {
    const hostile = "<script>alert('x')</script>\n\"quoted\"";
    const nested = [{ notes: hostile }];
    const limitations = [hostile];
    const input = syntheticEvidence({ resourceName: hostile, observedFields: { nested }, limitations });
    const result = validateEvidenceObject(input);
    expect(result.success).toBe(true);
    nested[0].notes = "changed"; limitations[0] = "changed"; input.resourceName = "changed";
    if (result.success) {
      expect(result.data.resourceName).toBe(hostile);
      expect(result.data.observedFields.nested).toEqual([{ notes: hostile }]);
      expect(result.data.limitations).toEqual([hostile]);
      expect(Object.isFrozen(result.data)).toBe(true);
      expect(Object.isFrozen(result.data.observedFields)).toBe(true);
      expect(Object.isFrozen(result.data.observedFields.nested)).toBe(true);
      expect(Object.isFrozen((result.data.observedFields.nested as unknown[])[0])).toBe(true);
    }
  });
});
