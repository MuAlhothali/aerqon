import type { EvidenceObject } from "../domain/types";

export const evidenceLimits = Object.freeze({ depth: 16, keys: 128, array: 256, string: 10_000, nodes: 5_000, totalText: 100_000 });
const forbidden = new Set(["__proto__", "prototype", "constructor"]);
type Json = null | boolean | number | string | readonly Json[] | { readonly [key: string]: Json };
const stringFields = ["evidenceId", "assessmentId", "sourceId", "service", "resourceType", "resourceId", "resourceName", "accountPlaceholder", "region", "sourceApi", "observedAt"] as const;
const allowed = new Set<string>([...stringFields, "observedFields", "expectedFields", "completeness", "retrievalState", "validationState", "limitations"]);
const booleanFields = ["publicAccessBlockEnabled", "isPublic", "defaultEncryptionEnabled", "publiclyAccessible", "storageEncrypted"];

export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function isTimestamp(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)
    && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
}

// Depth is checked before recursion. Copy only JSON data descriptors.
// Reject getters, exotic objects, cycles, sparse arrays and excessive data.
export function copyBoundedJson(input: unknown): Json {
  let nodes = 0;
  let text = 0;
  const ancestors = new WeakSet<object>();
  function copy(value: unknown, depth: number): Json {
    if (depth > evidenceLimits.depth || ++nodes > evidenceLimits.nodes) throw new Error("Input exceeds structural limits.");
    if (typeof value === "string") {
      text += value.length;
      if (value.length > evidenceLimits.string || text > evidenceLimits.totalText) throw new Error("Input exceeds text limits.");
      return value;
    }
    if (value === null || typeof value === "boolean") return value;
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value !== "object" || value === null) throw new Error("Expected JSON data.");
    if (ancestors.has(value)) throw new Error("Cyclic input.");
    ancestors.add(value);
    const array = Array.isArray(value);
    if (!array && Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) throw new Error("Expected plain object.");
    const keys = Reflect.ownKeys(value);
    if (array && (value.length > evidenceLimits.array || keys.length !== value.length + 1)) throw new Error("Invalid array.");
    if (!array && keys.length > evidenceLimits.keys) throw new Error("Too many keys.");
    const output: Record<string, Json> = {};
    const items: Json[] = [];
    for (const key of keys) {
      if (array && key === "length") continue;
      if (typeof key !== "string" || forbidden.has(key) || key.length > evidenceLimits.string) throw new Error("Invalid key.");
      text += key.length;
      if (text > evidenceLimits.totalText) throw new Error("Input exceeds text limits.");
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) throw new Error("Expected enumerable data property.");
      if (array) {
        if (!/^(0|[1-9]\d*)$/.test(key) || Number(key) !== items.length) throw new Error("Expected dense array.");
        items.push(copy(descriptor.value, depth + 1));
      } else output[key] = copy(descriptor.value, depth + 1);
    }
    ancestors.delete(value);
    return Object.freeze(array ? items : output);
  }
  return copy(input, 0);
}

export type EvidenceValidationResult = { success: true; data: Readonly<EvidenceObject> } | { success: false; issues: readonly string[] };

export function validateEvidenceObject(input: unknown): EvidenceValidationResult {
  try {
    const data = copyBoundedJson(input);
    if (!isRecord(data) || Object.keys(data).some((key) => !allowed.has(key))) throw new Error("Unexpected evidence shape.");
    for (const key of stringFields) {
      if (typeof data[key] !== "string" || data[key].trim().length === 0) throw new Error("Missing string field.");
    }
    if (!isTimestamp(data.observedAt)) throw new Error("Invalid observedAt timestamp.");
    if (!isRecord(data.observedFields)) throw new Error("Expected observedFields object.");
    for (const key of booleanFields) {
      if (Object.hasOwn(data.observedFields, key) && typeof data.observedFields[key] !== "boolean") throw new Error("Expected boolean field.");
    }
    for (const key of ["expectedFields", "limitations"] as const) {
      if (!Array.isArray(data[key]) || !data[key].every((item) => typeof item === "string" && item.length > 0)) throw new Error("Invalid string array.");
    }
    if (typeof data.completeness !== "string" || !["COMPLETE", "PARTIAL", "INSUFFICIENT"].includes(data.completeness)) throw new Error("Invalid completeness.");
    if (typeof data.retrievalState !== "string" || !["RETRIEVED", "ACCESS_DENIED", "UNAVAILABLE"].includes(data.retrievalState)) throw new Error("Invalid retrievalState.");
    if (data.validationState !== "VALID") throw new Error("Invalid validationState.");
    return { success: true, data: data as unknown as Readonly<EvidenceObject> };
  } catch {
    return { success: false, issues: ["Evidence is malformed, unsafe, or exceeds documented limits."] };
  }
}
