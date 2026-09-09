import { ruleDefinitions, type SupportedRuleId } from "./rules";
import { evidenceLimits, isTimestamp, validateEvidenceObject } from "../schemas/evidence-schema";
import type { EvidenceObject, EvaluationState, ResourceIdentity, RuleEvaluation } from "./types";

export interface EvaluationContext { assessmentId: string; evaluatedAt: string; inScope?: boolean; }
export const compareText = (a: string, b: string): number => a < b ? -1 : a > b ? 1 : 0;

export function resourceIdentity(evidence: ResourceIdentity): ResourceIdentity {
  return Object.freeze({ service: evidence.service, resourceType: evidence.resourceType, resourceId: evidence.resourceId, accountPlaceholder: evidence.accountPlaceholder, region: evidence.region });
}
export function sameResource(a: ResourceIdentity | undefined, b: ResourceIdentity | undefined): boolean {
  return !!a && !!b && a.service === b.service && a.resourceType === b.resourceType && a.resourceId === b.resourceId && a.accountPlaceholder === b.accountPlaceholder && a.region === b.region;
}

// Canonical ordering is for identifiers and duplicate detection, never choosing
// the first observation as the rule's conclusion.
function canonical(value: unknown): string {
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return "{" + Object.keys(record).sort(compareText).map((key) => JSON.stringify(key) + ":" + canonical(record[key])).join(",") + "}";
  }
  return JSON.stringify(value);
}

type Check = "VIOLATION" | "COMPLIANT" | "MISSING" | "INVALID";
function protocolNumber(value: unknown): number | undefined {
  if (typeof value === "number") return Number.isInteger(value) && value >= -1 && value <= 255 ? value : undefined;
  if (typeof value !== "string") return undefined;
  const names: Record<string, number> = { tcp: 6, udp: 17, icmp: 1, icmpv6: 58 };
  const name = value.toLowerCase();
  if (Object.hasOwn(names, name)) return names[name];
  if (!/^(?:-1|0|[1-9]\d{0,2})$/.test(value)) return undefined;
  const number = Number(value);
  return number <= 255 ? number : undefined;
}

// Phase 2 accepts standard IPv4/IPv6 CIDR notation. Unsupported spellings
// produce uncertainty; they are never interpreted as a restricted source.
function cidrState(value: unknown): "WORLD" | "RESTRICTED" | "INVALID" {
  if (typeof value !== "string") return "INVALID";
  const parts = value.split("/");
  if (parts.length !== 2 || !/^(0|[1-9]\d{0,2})$/.test(parts[1])) return "INVALID";
  const [ip, prefixText] = parts;
  const prefix = Number(prefixText);
  if (ip.includes(".")) {
    const octets = ip.split(".");
    if (octets.length !== 4 || prefix > 32 || !octets.every((v) => /^(0|[1-9]\d{0,2})$/.test(v) && Number(v) <= 255)) return "INVALID";
    return prefix === 0 ? "WORLD" : "RESTRICTED";
  }
  if (!ip.includes(":") || prefix > 128 || !/^[0-9a-fA-F:]+$/.test(ip)) return "INVALID";
  const halves = ip.split("::");
  if (halves.length > 2) return "INVALID";
  const groups = halves.flatMap((half) => half === "" ? [] : half.split(":"));
  if (!groups.every((v) => /^[0-9a-fA-F]{1,4}$/.test(v))) return "INVALID";
  if (halves.length === 1 ? groups.length !== 8 : groups.length >= 8) return "INVALID";
  return prefix === 0 ? "WORLD" : "RESTRICTED";
}

function ingressCheck(ruleId: SupportedRuleId, fields: Readonly<Record<string, unknown>>): Check {
  if (!Object.hasOwn(fields, "protocol") || !Object.hasOwn(fields, "cidr")) return "MISSING";
  const protocol = protocolNumber(fields.protocol);
  const cidr = cidrState(fields.cidr);
  if (protocol === undefined || cidr === "INVALID") return "INVALID";
  if (ruleId === "SG-002") return protocol === -1 && cidr === "WORLD" ? "VIOLATION" : "COMPLIANT";
  if (protocol === -1) return cidr === "WORLD" ? "VIOLATION" : "COMPLIANT";
  if (protocol !== 6) return "COMPLIANT";
  if (!Object.hasOwn(fields, "fromPort")) return "MISSING";
  // Legacy Phase 2 single-port shape: fromPort with no toPort denotes one port.
  const from = fields.fromPort;
  const to = Object.hasOwn(fields, "toPort") ? fields.toPort : from;
  if (typeof from !== "number" || typeof to !== "number" || !Number.isInteger(from) || !Number.isInteger(to) || from < 0 || to > 65535 || from > to) return "INVALID";
  return from <= 22 && to >= 22 && cidr === "WORLD" ? "VIOLATION" : "COMPLIANT";
}

export function evaluateRule(ruleId: SupportedRuleId, input: readonly unknown[], context: EvaluationContext): RuleEvaluation {
  if (!Object.hasOwn(ruleDefinitions, ruleId)) throw new Error("Unsupported rule.");
  if (!context || typeof context.assessmentId !== "string" || !context.assessmentId.trim() || !isTimestamp(context.evaluatedAt) || (context.inScope !== undefined && typeof context.inScope !== "boolean")) throw new Error("Invalid evaluation context.");
  const rule = ruleDefinitions[ruleId];
  let evidence: readonly Readonly<EvidenceObject>[] = [];
  let resource: ResourceIdentity | undefined;
  const result = (state: EvaluationState, diagnosticCode: string, rationale: string): RuleEvaluation => {
    const conclusive = state === "PASS" || state === "FAIL";
    const evidenceBindings = Object.freeze(evidence.map(({ evidenceId, sourceId }) => Object.freeze({ evidenceId, sourceId }))
      .sort((a, b) => compareText(a.evidenceId, b.evidenceId) || compareText(a.sourceId, b.sourceId)));
    const ids = Object.freeze(evidenceBindings.map((item) => item.evidenceId));
    return Object.freeze({
      evaluationId: JSON.stringify([context.assessmentId, ruleId, rule.version, context.evaluatedAt, resource ?? null, evidenceBindings]),
      assessmentId: context.assessmentId, ruleId, ruleVersion: rule.version, evidenceIds: ids,
      evidenceBindings,
      sourceIds: Object.freeze([...new Set(evidenceBindings.map((item) => item.sourceId))].sort(compareText)),
      evaluatedAt: context.evaluatedAt, evaluationState: state, rationale,
      severity: rule.defaultSeverity, severityRationale: rule.severityRationale,
      confidence: conclusive ? "HIGH" : "LOW",
      confidenceRationale: conclusive ? "Complete validated rule-required observations support this conclusion." : "Evidence cannot support a definitive control conclusion.",
      evidenceCompleteness: conclusive ? "COMPLETE" : state === "PARTIAL_EVIDENCE" ? "PARTIAL" : "INSUFFICIENT",
      diagnosticCode, findingEligible: state === "FAIL", ...(resource ? { resource } : {}),
    });
  };
  if (!Array.isArray(input) || input.length > evidenceLimits.array) return result("UNKNOWN", "INVALID_EVIDENCE", "Evidence must be a bounded array.");
  const parsed = [];
  for (const item of input) {
    const validation = validateEvidenceObject(item);
    if (!validation.success) return result("UNKNOWN", "INVALID_EVIDENCE", "Evidence failed runtime validation.");
    parsed.push(validation.data);
  }
  // Detect conflicting reuse of IDs; identical duplicates do not count twice.
  const unique = new Map<string, Readonly<EvidenceObject>>();
  for (const item of parsed) {
    const previous = unique.get(item.evidenceId);
    if (previous && canonical(previous) !== canonical(item)) return result("UNKNOWN", "CONFLICTING_EVIDENCE_ID", "One evidence ID identifies different observations.");
    unique.set(item.evidenceId, item);
  }
  evidence = [...unique.values()].sort((a, b) => compareText(a.evidenceId, b.evidenceId));
  if (evidence.some((item) => item.assessmentId !== context.assessmentId)) return result("UNKNOWN", "CROSS_ASSESSMENT_EVIDENCE", "Evidence belongs to a different assessment.");
  if (evidence.length && !evidence.every((item) => sameResource(item, evidence[0]))) return result("UNKNOWN", "MIXED_RESOURCES", "Evidence must describe one account, region, service and resource.");
  if (evidence.length) resource = resourceIdentity(evidence[0]);
  if (evidence.some((item) => item.observedAt > context.evaluatedAt)) return result("UNKNOWN", "FUTURE_OBSERVATION", "Observation is later than evaluation time.");

  // API names alone cannot establish applicability. Identity checks above
  // deliberately retain the existing cross-assessment/mixed-resource guards.
  evidence = evidence.filter((item) => item.service === rule.service
    && item.resourceType === rule.applicableResourceType && rule.requiredEvidence.includes(item.sourceApi));
  if (evidence.some((item) => item.retrievalState === "ACCESS_DENIED")) return result("ACCESS_DENIED", "ACCESS_DENIED", "Required API evidence was denied; this is not a security failure.");
  if (evidence.some((item) => item.retrievalState === "UNAVAILABLE" || item.completeness !== "COMPLETE")) return result("PARTIAL_EVIDENCE", "INCOMPLETE_EVIDENCE", "Required evidence is incomplete or unavailable; the control cannot be verified.");
  if (context.inScope === false) return result("NOT_EVALUATED", "OUT_OF_SCOPE", "Rule is outside the current evaluation scope.");
  if (!parsed.length) return result("UNKNOWN", "MISSING_EVIDENCE", "No evidence was supplied.");
  if (!evidence.length) return result("NOT_APPLICABLE", "IRRELEVANT_EVIDENCE", "No supplied observation matches this rule's service, resource type and required API contract.");

  let check: Check;
  if (ruleId === "SG-001" || ruleId === "SG-002") {
    const checks = evidence.map((item) => ingressCheck(ruleId, item.observedFields));
    check = checks.includes("INVALID") ? "INVALID" : checks.includes("MISSING") ? "MISSING" : checks.includes("VIOLATION") ? "VIOLATION" : "COMPLIANT";
  } else {
    // Scalar fields must agree across all observations of the same API.
    const boolean = (api: string, key: string): boolean | "MISSING" | "INVALID" => {
      const records = evidence.filter((item) => item.sourceApi === api);
      if (!records.length) return "MISSING";
      const values = records.map((item) => item.observedFields[key]);
      if (values.some((value) => value !== undefined && typeof value !== "boolean")) return "INVALID";
      if (values.includes(true) && values.includes(false)) return "INVALID";
      if (values.includes(undefined)) return "MISSING";
      return values[0] as boolean;
    };
    if (ruleId === "S3-001") {
      const pab = boolean("GetPublicAccessBlock", "publicAccessBlockEnabled");
      const policy = boolean("GetBucketPolicyStatus", "isPublic");
      check = pab === "INVALID" || policy === "INVALID" ? "INVALID"
        : pab === "MISSING" || policy === "MISSING" ? "MISSING"
        : pab && policy ? "INVALID" : policy ? "VIOLATION" : "COMPLIANT";
    } else {
      const key = ruleId === "S3-002" ? "defaultEncryptionEnabled" : ruleId === "RDS-001" ? "publiclyAccessible" : "storageEncrypted";
      const value = boolean(rule.requiredEvidence[0], key);
      check = value === "MISSING" || value === "INVALID" ? value
        : value === (ruleId === "RDS-001") ? "VIOLATION" : "COMPLIANT";
    }
  }
  if (check === "INVALID") return result("UNKNOWN", "INVALID_REQUIRED_FIELDS", "Required observations are malformed or inconsistent.");
  if (check === "MISSING") return result("PARTIAL_EVIDENCE", "MISSING_REQUIRED_FIELDS", "Rule-required fields or API observations are missing.");
  if (check === "VIOLATION") return result("FAIL", "CONFIRMED_VIOLATION", ruleId === "RDS-001"
    ? "Configured as publicly accessible; end-to-end network reachability was not established."
    : "Complete validated evidence demonstrates the control condition is violated.");
  return result("PASS", "CONFIRMED_COMPLIANCE", "Complete validated evidence establishes that the failure condition is absent.");
}

// Recompute from the supplied evidence: neither a boolean nor a fabricated
// PASS object establishes proof. This is intentionally local and synchronous.
export function verifyEvaluation(evaluation: RuleEvaluation, evidence: readonly unknown[]): boolean {
  try {
    const replay = evaluateRule(evaluation.ruleId as SupportedRuleId, evidence, {
      assessmentId: evaluation.assessmentId, evaluatedAt: evaluation.evaluatedAt,
      inScope: evaluation.evaluationState !== "NOT_EVALUATED",
    });
    // Compare only the fixed evaluation schema; never recursively traverse an
    // untrusted proof object. Extra fields, altered provenance and getters fail.
    const keys = Object.keys(replay) as (keyof RuleEvaluation)[];
    if (Reflect.ownKeys(evaluation).length !== keys.length) return false;
    return keys.every((key) => {
      const property = Object.getOwnPropertyDescriptor(evaluation, key);
      if (!property || !("value" in property)) return false;
      const actual = property.value;
      const expected = replay[key];
      if (key === "resource") {
        if (!actual || typeof actual !== "object" || Reflect.ownKeys(actual).length !== 5) return false;
        return Object.entries(replay.resource!).every(([name, value]) => {
          const descriptor = Object.getOwnPropertyDescriptor(actual, name);
          return descriptor && "value" in descriptor && descriptor.value === value;
        });
      }
      if (key === "evidenceBindings") {
        return Array.isArray(actual) && actual.length === replay.evidenceBindings.length
          && Reflect.ownKeys(actual).length === actual.length + 1
          && replay.evidenceBindings.every((binding, index) => {
            const entry = Object.getOwnPropertyDescriptor(actual, String(index));
            const pair = entry && "value" in entry ? entry.value : undefined;
            return pair !== null && typeof pair === "object" && Reflect.ownKeys(pair).length === 2
              && Object.entries(binding).every(([name, value]) => {
                const field = Object.getOwnPropertyDescriptor(pair, name);
                return field && "value" in field && field.value === value;
              });
          });
      }
      if (Array.isArray(expected)) return Array.isArray(actual) && actual.length === expected.length
        && expected.every((value, index) => Object.getOwnPropertyDescriptor(actual, String(index))?.value === value);
      return actual === expected;
    });
  } catch {
    return false;
  }
}
