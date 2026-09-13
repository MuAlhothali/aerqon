import { describe, expect, it } from "vitest";
import { buildProductDemo } from "../demo/product-demo";
import { evaluateRule } from "../domain/evaluate";
import { verifyRecheck, verifyResolution } from "../domain/remediation";
import { projectWorkflow } from "./prototype-workflow";
import { runEvidencePipeline } from "./evidence-pipeline";
import { syntheticAdapters } from "../demo/evidence-prototype";
import { directAwsSource, directObservations } from "../demo/fixtures/direct-aws";
import type { DirectObservation } from "../infrastructure/synthetic/direct-aws-adapter";

const model = buildProductDemo();
const admin = model.details.find((item) => item.finding.resourceId === "sg-demo-admin")!;

describe("verified product workflow", () => {
  it.each([
    ["SG-001", "sg-demo-admin", "FAIL", "PASS", "RESOLVED"],
    ["RDS-002", "northstar-demo-legacy-db", "FAIL", "FAIL", "OPEN"],
    ["S3-001", "northstar-demo-public-assets", "FAIL", "PARTIAL_EVIDENCE", "IN_PROGRESS"],
  ])("%s on %s preserves %s → %s with remediation %s", (rule, resource, before, after, remediation) => {
    const detail = model.details.find((item) => item.finding.ruleId === rule && item.finding.resourceId === resource)!;
    expect(detail.baselineEvaluation?.evaluationState).toBe(before);
    expect(detail.currentEvaluation?.evaluationState).toBe(after); expect(detail.finding.remediationState).toBe(remediation);
    expect(detail.timeline).toHaveLength(3);
  });
  it("retains baseline snapshots and unique observation identities across collection times", () => {
    expect(admin.originalFinding.remediationState).toBe("OPEN"); expect(admin.originalFinding.evaluationState).toBe("FAIL");
    expect(admin.baselineEvidence.every((item) => item.observedFields.cidr === "0.0.0.0/0")).toBe(true);
    expect(admin.currentEvidence.every((item) => item.observedFields.cidr === "10.0.0.0/8")).toBe(true);
    expect(admin.currentEvidence.every((item) => !admin.baselineEvidence.some((before) => before.evidenceId === item.evidenceId))).toBe(true);
    expect(buildProductDemo()).toEqual(model);
  });
  it("reports derive their finding lists from the same verified workflow", () => {
    expect(model.summary).toEqual({ resolved: 1, open: 4, inProgress: 1, reopened: 0 });
    for (const report of model.reports) expect(report.findingIds).toEqual(model.details.map((item) => item.finding.findingId));
    expect(model.baseline.coverage.counts.NOT_EVALUATED).toBe(1);
    expect(model.baseline.coverage.counts.NOT_APPLICABLE).toBeGreaterThan(0);
    const denied = model.baseline.evidence.find((item) => item.resourceId === "northstar-demo-archive")!;
    expect(denied.retrievalState).toBe("ACCESS_DENIED"); expect(denied.completeness).toBe("INSUFFICIENT");
    expect(model.baseline.evaluations.find((item) => item.ruleId === "S3-001" && item.resource?.resourceId === "northstar-demo-logs")?.evaluationState).toBe("PASS");
  });
  it("customer status claims cannot resolve a finding without compatible PASS evidence", () => {
    const legacy = model.details.find((item) => item.finding.ruleId === "RDS-002")!;
    const changed = projectWorkflow(model.baseline, model.current, [{ ...legacy.action, status: "RESOLVED", notes: "Customer says fixed" }]);
    expect(changed.details.find((item) => item.finding.ruleId === "RDS-002")!.finding.remediationState).toBe("OPEN");
  });
  it("rejects swapped, stale, historical and incompatible PASS proofs", () => {
    const current = admin.currentEvaluation!;
    const open = admin.originalFinding;
    for (const evidence of [admin.currentEvidence.map((item) => ({ ...item, sourceId: "swapped" })), admin.baselineEvidence]) {
      expect(verifyResolution(open, { evaluation: current, evidence }, model.current.generatedAt)).toBe(open);
    }
    for (const change of [{ ruleVersion: "1.1.0" }, { assessmentId: "other" }, { resource: { ...current.resource!, resourceId: "other" } }]) {
      expect(verifyResolution(open, { evaluation: { ...current, ...change }, evidence: admin.currentEvidence }, model.current.generatedAt)).toBe(open);
    }
  });
  it("genuinely reopens only from fresh compatible FAIL evidence", () => {
    const resolved = admin.finding;
    const time = "2026-09-11T00:00:00.000Z";
    const evidence = admin.currentEvidence.map((item) => ({ ...item, observedAt: time, evidenceId: item.evidenceId + ":reopened", observedFields: { protocol: "tcp", fromPort: 22, cidr: "::/0" } }));
    const evaluation = evaluateRule("SG-001", evidence, { assessmentId: resolved.assessmentId, evaluatedAt: time });
    const reopened = verifyRecheck(resolved, { evaluation, evidence }, time);
    expect(reopened.remediationState).toBe("REOPENED"); expect(reopened.evaluationState).toBe("FAIL");
    expect(reopened.resolvedAt).toBe(resolved.resolvedAt); expect(reopened.reopenedAt).toBe(time);
    expect(verifyRecheck(resolved, { evaluation: { ...evaluation, ruleVersion: "1.1.0" }, evidence }, time)).toBe(resolved);
  });
  it.each(["UNKNOWN", "ACCESS_DENIED", "NOT_APPLICABLE", "PARTIAL_EVIDENCE"] as const)("%s never reopens or resolves by itself", (evaluationState) => {
    const proof = { evaluation: { ...admin.currentEvaluation!, evaluationState }, evidence: admin.currentEvidence };
    expect(verifyRecheck(admin.finding, proof, model.current.generatedAt)).toBe(admin.finding);
  });
  it.each([
    ["PASS", "FAIL"], ["UNKNOWN", "PASS"], ["ACCESS_DENIED", "UNKNOWN"],
  ] as const)("projects actual %s → %s evidence transitions, including resources without baseline findings", (beforeState, afterState) => {
    const snapshot = (state: string, time: string) => {
      const observation: DirectObservation = { ...directObservations[1], observedAt: time,
        fields: { protocol: "tcp", fromPort: state === "PASS" ? 443 : 22, toPort: state === "PASS" ? 443 : 22,
          cidr: state === "UNKNOWN" ? "unrecognized-cidr" : "0.0.0.0/0" },
        retrievalState: state === "ACCESS_DENIED" ? "ACCESS_DENIED" : "RETRIEVED" };
      const source = directAwsSource(model.baseline.assessment.assessmentId, [observation], time);
      const result = runEvidencePipeline({ ...model.baseline.assessment, evidenceSourceIds: [source.sourceId] }, [source], { generatedAt: time }, syntheticAdapters);
      if (!result.success) throw new Error("Expected valid transition fixture");
      return result.projection;
    };
    const baseline = snapshot(beforeState, "2026-09-09T01:00:00.000Z");
    const current = snapshot(afterState, "2026-09-10T01:00:00.000Z");
    const original = JSON.stringify(baseline);
    const projected = projectWorkflow(baseline, current, []);
    const comparison = projected.comparisons.find((item) => item.ruleId === "SG-001")!;
    expect(comparison.baseline?.evaluationState).toBe(beforeState);
    expect(comparison.current?.evaluationState).toBe(afterState);
    expect(comparison.current?.ruleVersion).toBe(comparison.version);
    expect(current.findings.some((item) => item.ruleId === "SG-001")).toBe(afterState === "FAIL");
    if (afterState === "FAIL") {
      const newlyDetected = projected.actions.find((item) => item.finding.ruleId === "SG-001")!;
      expect(newlyDetected.verification).toBe("NEW"); expect(newlyDetected.origin).toBe("RECHECK");
      expect(newlyDetected.baselineEvaluation?.evaluationState).toBe("PASS");
      expect(newlyDetected.finding.remediationState).toBe("OPEN"); expect(projected.summary.open).toBe(1);
      for (const report of projected.reports) expect(report.findingIds).toContain(newlyDetected.finding.findingId);
    }
    expect(JSON.stringify(baseline)).toBe(original);
  });
  it("retains historical FAIL as unverified rather than falsely claiming a fresh recheck", () => {
    const source = directAwsSource(model.baseline.assessment.assessmentId);
    const result = runEvidencePipeline({ ...model.baseline.assessment, evidenceSourceIds: [source.sourceId] }, [source],
      { generatedAt: model.current.generatedAt }, syntheticAdapters);
    if (!result.success) throw new Error("Expected historical observation snapshot");
    const projected = projectWorkflow(model.baseline, result.projection, []);
    const detail = projected.details.find((item) => item.finding.resourceId === "sg-demo-admin")!;
    expect(detail.currentEvaluation?.evaluationState).toBe("FAIL");
    expect(detail.finding.remediationState).toBe("OPEN");
    expect(detail.verification).toBe("UNABLE_TO_VERIFY"); expect(detail.evidenceFreshness).toBe("HISTORICAL");
    expect(detail.timeline.at(-1)?.eventType).toBe("RECHECKED");
    expect(detail.timeline.at(-1)?.description).toContain("Historical observations");
    expect(detail.timeline.at(-1)?.description).not.toContain("Fresh evidence");
  });
  it("uses the pipeline-owned original import snapshot, not an independently supplied display source", () => {
    expect(model.originalSources).toBe(model.baseline.originalSources);
    expect(Object.isFrozen(model.originalSources)).toBe(true);
    expect(Object.isFrozen(model.originalSources[0].observations)).toBe(true);
    expect(model.originalSources[0].sourceName).toBe(model.baseline.sourceManifest[0].sourceName);
  });
});
