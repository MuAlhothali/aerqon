import { compareText, resourceIdentity, sameResource, verifyEvaluation } from "../domain/evaluate";
import { verifyRecheck, verifyRecheckEvidence } from "../domain/remediation";
import { sortFindings } from "../domain/prioritize";
import type { EvidenceObject, Finding, RemediationAction, RuleEvaluation, TimelineEvent } from "../domain/types";
import type { AssessmentProjection } from "./assessment-projection";
import type { SourceEnvelope } from "./source-contract";

export interface FindingDetailProjection {
  originalFinding: Finding; finding: Finding; baselineEvaluation?: RuleEvaluation; currentEvaluation?: RuleEvaluation;
  origin: "BASELINE" | "RECHECK"; initialRemediationState: RemediationAction["status"];
  evidenceFreshness: "FRESH" | "HISTORICAL" | "MISSING";
  baselineEvidence: readonly Readonly<EvidenceObject>[]; currentEvidence: readonly Readonly<EvidenceObject>[];
  action: RemediationAction; timeline: readonly TimelineEvent[];
  verification: "VERIFIED_RESOLVED" | "STILL_OPEN" | "UNABLE_TO_VERIFY" | "REOPENED" | "NEW";
}
export interface ComparisonProjection {
  resourceId: string; ruleId: string; version: string; baseline?: RuleEvaluation; current?: RuleEvaluation;
  baselineEvidence: readonly Readonly<EvidenceObject>[]; currentEvidence: readonly Readonly<EvidenceObject>[];
}
export interface PrototypeProjection {
  originalSources: readonly SourceEnvelope[];
  baseline: AssessmentProjection; current: AssessmentProjection;
  details: readonly FindingDetailProjection[]; actions: readonly FindingDetailProjection[];
  comparisons: readonly ComparisonProjection[];
  summary: { resolved: number; open: number; inProgress: number; reopened: number };
  reports: readonly { id: "executive" | "technical" | "package" | "recheck"; generatedAt: string; findingIds: readonly string[] }[];
}

function resourceEvidence(projection: AssessmentProjection, evaluation?: RuleEvaluation) {
  return evaluation ? projection.evidence.filter((item) => sameResource(item, evaluation.resource)) : [];
}

export function projectWorkflow(baseline: AssessmentProjection, current: AssessmentProjection, suppliedActions: readonly RemediationAction[]): PrototypeProjection {
  if (baseline.status !== "COMPLETE" || current.status !== "COMPLETE"
    || baseline.assessment.assessmentId !== current.assessment.assessmentId || current.generatedAt < baseline.generatedAt) throw new Error("Workflow requires compatible complete pipeline snapshots.");
  const existing = baseline.findings.map((original) => ({ original, origin: "BASELINE" as const }));
  const discovered = current.findings.filter((finding) => !baseline.findings.some((previous) => previous.ruleId === finding.ruleId && sameResource(previous, finding)))
    .map((original) => ({ original, origin: "RECHECK" as const }));
  const details = [...existing, ...discovered].map(({ original, origin }): FindingDetailProjection => {
    const baselineEvaluation = baseline.evaluations.find((item) => item.ruleId === original.ruleId && sameResource(item.resource, original));
    const before = resourceEvidence(baseline, baselineEvaluation);
    const currentEvaluation = current.evaluations.find((item) => item.ruleId === original.ruleId && sameResource(item.resource, original));
    const after = resourceEvidence(current, currentEvaluation);
    const detection = origin === "BASELINE" ? baselineEvaluation : currentEvaluation;
    if (!detection || detection.evaluationId !== original.evaluationId || detection.evaluationState !== "FAIL"
      || !verifyEvaluation(detection, origin === "BASELINE" ? before : after)) throw new Error("Finding detection proof integrity failure.");
    const supplied = suppliedActions.find((item) => item.findingId === original.findingId);
    // Administrative input cannot assign RESOLVED/REOPENED; verification owns those.
    const allowed = supplied && ["OPEN", "ACKNOWLEDGED", "IN_PROGRESS", "RISK_ACCEPTED"].includes(supplied.status);
    const action: RemediationAction = { actionId: original.findingId + ":action", findingId: original.findingId,
      owner: supplied?.owner || "Engineering", status: allowed ? supplied.status : "OPEN",
      actionDescription: original.recommendation, verificationCondition: original.verificationSteps.join(" "), notes: supplied?.notes || "" };
    const initial = { ...original, remediationState: action.status };
    const proof = currentEvaluation ? { evaluation: currentEvaluation, evidence: after } : undefined;
    const validCurrent = origin === "BASELINE" && proof && verifyRecheckEvidence(initial, proof, current.generatedAt);
    const finding = origin === "BASELINE" && proof ? verifyRecheck(initial, proof, current.generatedAt) : initial;
    const evidenceFreshness = !after.length ? "MISSING" : after.every((item) => item.observedAt >= (origin === "BASELINE" ? original.lastSeenAt : baseline.generatedAt)) ? "FRESH" : "HISTORICAL";
    const verification = origin === "RECHECK" ? "NEW" : validCurrent && finding.remediationState === "RESOLVED" ? "VERIFIED_RESOLVED"
      : finding.remediationState === "REOPENED" ? "REOPENED"
        : validCurrent && currentEvaluation?.evaluationState === "FAIL" ? "STILL_OPEN" : "UNABLE_TO_VERIFY";
    const detectedAt = origin === "BASELINE" ? baseline.generatedAt : current.generatedAt;
    const timeline: TimelineEvent[] = [
      { eventId: original.findingId + ":detected", findingId: original.findingId, eventType: "DETECTED", eventAt: detectedAt,
        actorType: "SYSTEM", description: origin === "BASELINE" ? "Validated baseline evidence confirmed the rule condition." : "A newly detected failure was confirmed in the recheck snapshot; no baseline failure was assumed.", supportingEvidenceIds: detection.evidenceIds },
      { eventId: original.findingId + ":assigned", findingId: original.findingId, eventType: "ACKNOWLEDGED", eventAt: detectedAt,
        actorType: "REVIEWER", description: "Synthetic owner/action assignment; not a claim of verified remediation.", supportingEvidenceIds: [] },
    ];
    if (origin === "BASELINE") timeline.push(
      { eventId: original.findingId + ":rechecked", findingId: original.findingId, eventType: verification === "VERIFIED_RESOLVED" ? "RESOLVED" : verification === "STILL_OPEN" ? "VERIFIED" : "RECHECKED",
        eventAt: current.generatedAt, actorType: "SYSTEM", description: verification === "VERIFIED_RESOLVED"
          ? "Fresh matching PASS evidence verified resolution." : verification === "STILL_OPEN"
            ? "Fresh evidence still confirms the failure condition." : evidenceFreshness === "HISTORICAL"
              ? "Historical observations cannot establish fresh verification; remediation state was retained."
              : "The recheck could not verify resolution; remediation state was retained.",
        supportingEvidenceIds: currentEvaluation?.evidenceIds ?? [] },
    );
    return { originalFinding: original, origin, initialRemediationState: action.status, evidenceFreshness, finding, baselineEvaluation, currentEvaluation, baselineEvidence: before, currentEvidence: after,
      action: { ...action, status: finding.remediationState }, timeline, verification };
  });
  const orderedIds = sortFindings(details.map((item) => item.finding)).map((item) => item.findingId);
  const actions = orderedIds.map((id) => details.find((item) => item.finding.findingId === id)!);
  const comparisonKey = (evaluation: RuleEvaluation) => JSON.stringify([evaluation.ruleId, evaluation.resource ? resourceIdentity(evaluation.resource) : null]);
  const keys = new Map([...baseline.evaluations, ...current.evaluations].map((item) => [comparisonKey(item), item]));
  const comparisons: ComparisonProjection[] = [...keys].sort(([a], [b]) => compareText(a, b)).map(([key, evaluation]) => {
    const previous = baseline.evaluations.find((item) => comparisonKey(item) === key);
    const next = current.evaluations.find((item) => comparisonKey(item) === key);
    return { resourceId: evaluation.resource?.resourceId ?? "", ruleId: evaluation.ruleId, version: evaluation.ruleVersion,
      baseline: previous, current: next, baselineEvidence: resourceEvidence(baseline, previous), currentEvidence: resourceEvidence(current, next) };
  });
  return { originalSources: baseline.originalSources, baseline, current, details, actions, comparisons, summary: {
    resolved: details.filter((item) => item.finding.remediationState === "RESOLVED").length,
    open: details.filter((item) => ["OPEN", "ACKNOWLEDGED", "RISK_ACCEPTED"].includes(item.finding.remediationState)).length,
    inProgress: details.filter((item) => item.finding.remediationState === "IN_PROGRESS").length,
    reopened: details.filter((item) => item.finding.remediationState === "REOPENED").length,
  }, reports: (["executive", "technical", "package", "recheck"] as const).map((id) => ({ id, generatedAt: current.generatedAt, findingIds: details.map((item) => item.finding.findingId) })) };
}
