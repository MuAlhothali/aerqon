import type { AdapterResult, PipelineDiagnostic, SourceEnvelope, SyntheticAdapter, SyntheticSourceType } from "../../application/source-contract";
import type { EvidenceObject } from "../../domain/types";
import { compareText } from "../../domain/evaluate";
import { isRecord, validateEvidenceObject } from "../../schemas/evidence-schema";
import { hasOnlyKeys, nonempty, validateSourceEnvelope } from "../../schemas/source-envelope";

export interface ObservationMapping {
  id: string; resource: string; api: string; time: string; facts: string; expected: string;
  completeness: string; retrieval: string; limitations: string;
  resourceKeys: readonly [string, string, string, string, string, string];
  vendorStrings: readonly string[];
  vendorStatuses: readonly string[];
}

export function createSyntheticAdapter(sourceType: SyntheticSourceType, mapping: ObservationMapping): SyntheticAdapter {
  return Object.freeze({ sourceType, normalize(input: unknown): AdapterResult {
    const parsed = validateSourceEnvelope(input);
    if (!parsed.success || parsed.data.sourceType !== sourceType) return { success: false, diagnostics: [{
      code: "INVALID_SOURCE", sourceId: "", observationId: "", message: "Invalid bounded synthetic source envelope or source format.",
    }] };
    const envelope = parsed.data;
    const evidence: Readonly<EvidenceObject>[] = [];
    const diagnostics: PipelineDiagnostic[] = [];
    for (const observation of envelope.observations) {
      const normalized = normalizeObservation(envelope, observation, mapping);
      if (normalized) evidence.push(normalized);
      else diagnostics.push({ code: "INVALID_OBSERVATION", sourceId: envelope.sourceId,
        observationId: isRecord(observation) && nonempty(observation[mapping.id]) ? observation[mapping.id] as string : "",
        message: "Observation failed its source format, chronology, or hardened evidence contract.",
      });
    }
    evidence.sort((a, b) => compareText(a.evidenceId, b.evidenceId));
    diagnostics.sort((a, b) => compareText(a.observationId, b.observationId));
    return { success: true, evidence: Object.freeze(evidence), diagnostics: Object.freeze(diagnostics), source: Object.freeze({
      sourceId: envelope.sourceId, sourceType, sourceName: envelope.sourceName,
      sourceVersion: envelope.sourceVersion ?? "UNSPECIFIED", importerVersion: envelope.importerVersion,
      collectedAt: envelope.collectedAt, classification: "SYNTHETIC",
    }) };
  } });
}

function normalizeObservation(envelope: SourceEnvelope, input: unknown, map: ObservationMapping): Readonly<EvidenceObject> | undefined {
  if (!isRecord(input) || !hasOnlyKeys(input, [map.id, map.resource, map.api, map.time, map.facts, map.expected,
    map.completeness, map.retrieval, map.limitations, ...map.vendorStrings, ...map.vendorStatuses]) || !nonempty(input[map.id])) return;
  // Vendor conclusions are bounded metadata only, never mapped to domain state.
  if (map.vendorStrings.some((key) => input[key] !== undefined && typeof input[key] !== "string")) return;
  if (map.vendorStatuses.some((key) => input[key] !== undefined && (!isRecord(input[key])
    || !hasOnlyKeys(input[key], ["Status"]) || typeof input[key].Status !== "string"))) return;
  const resource = input[map.resource];
  if (!isRecord(resource) || !hasOnlyKeys(resource, map.resourceKeys)) return;
  const [service, type, id, name, account, region] = map.resourceKeys;
  const candidate = {
    evidenceId: JSON.stringify([envelope.assessmentId, envelope.sourceId, input[map.id], input[map.time]]),
    assessmentId: envelope.assessmentId, sourceId: envelope.sourceId,
    service: resource[service], resourceType: resource[type], resourceId: resource[id], resourceName: resource[name],
    accountPlaceholder: resource[account], region: resource[region], sourceApi: input[map.api], observedAt: input[map.time],
    observedFields: input[map.facts], expectedFields: input[map.expected], completeness: input[map.completeness],
    retrievalState: input[map.retrieval], validationState: "VALID", limitations: input[map.limitations],
  };
  const validated = validateEvidenceObject(candidate);
  if (!validated.success || validated.data.observedAt > envelope.collectedAt) return;
  return validated.data;
}
