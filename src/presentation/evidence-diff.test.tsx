import { describe, expect, it } from "vitest";
import { buildProductDemo } from "../demo/product-demo";
import { compareObservedFields } from "./evidence-diff";
const model = buildProductDemo();
const sample = model.baseline.evidence[0];
describe("observed field comparison", () => {
  it("distinguishes missing, false, null and an empty list", () => {
    const before = [{ ...sample, observedFields: { enabled: false, empty: [], value: null } }];
    const after = [{ ...sample, observedFields: {} }];
    const rows = compareObservedFields(before, after);
    expect(rows.map((row) => row.before?.[0]).sort()).toEqual(["[]", "false", "null"]);
    expect(rows.every((row) => row.after === undefined && row.changed)).toBe(true);
  });
  it("compares only matching API/field pairs and retains conflicting source values", () => {
    const before = [{ ...sample, sourceApi: "A", observedFields: { enabled: true } }, { ...sample, sourceId: "other", sourceApi: "A", observedFields: { enabled: false } }];
    const after = [{ ...sample, sourceApi: "B", observedFields: { enabled: true } }];
    const rows = compareObservedFields(before, after);
    expect(rows).toHaveLength(2);
    expect(rows[0].before).toEqual(["false", "true"]);
    expect(rows[0].after).toBeUndefined();
    expect(rows[1].before).toBeUndefined();
  });
  it("deduplicates identical observations without depending on source order", () => {
    const before = [{ ...sample, observedFields: { enabled: true } }, { ...sample, observedFields: { enabled: false } }];
    const rows = compareObservedFields(before, [before[1], before[0], before[0]]);
    expect(rows[0].changed).toBe(false);
    expect(rows[0].before).toEqual(["false", "true"]);
  });
  it("shows the real SSH CIDR change without mutating the frozen projections", () => {
    const detail = model.details.find((d) => d.finding.resourceId === "sg-demo-admin")!;
    const snapshot = JSON.stringify(detail);
    const rows = compareObservedFields(detail.baselineEvidence, detail.currentEvidence);
    expect(JSON.stringify(rows)).toContain("0.0.0.0/0");
    expect(JSON.stringify(rows)).toContain("10.0.0.0/8");
    expect(rows.some((row) => row.changed)).toBe(true);
    expect(JSON.stringify(detail)).toBe(snapshot);
    expect(compareObservedFields([], [])).toEqual([]);
  });
});
