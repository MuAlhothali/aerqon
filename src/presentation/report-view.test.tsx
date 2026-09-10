import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { ReportView } from "./report-view";
import { buildProductDemo } from "../demo/product-demo";
import { runEvidencePipeline } from "../application/evidence-pipeline";
import { projectWorkflow } from "../application/prototype-workflow";
import { directAwsSource, directObservations } from "../demo/fixtures/direct-aws";
import { syntheticAdapters } from "../demo/evidence-prototype";

const model = buildProductDemo();
afterEach(cleanup);

describe("reports share evidence and preserve uncertainty", () => {
  it.each(["executive", "technical", "package", "recheck"] as const)("%s includes exact coverage and non-finding uncertainty", (kind) => {
    const { container } = render(<ReportView model={model} kind={kind} language="en" />);
    const coverage = screen.getByRole("region", { name: "Coverage ledger · not a security score" });
    for (const [label, state] of [["Pass", "PASS"], ["Fail", "FAIL"], ["Unknown", "UNKNOWN"], ["Partial evidence", "PARTIAL_EVIDENCE"], ["Access denied", "ACCESS_DENIED"], ["Not evaluated", "NOT_EVALUATED"], ["Not applicable", "NOT_APPLICABLE"]] as const) {
      const row = within(coverage).getByRole("row", { name: new RegExp(`^${label} `) });
      expect(within(row).getAllByRole("cell").map((cell) => cell.textContent)).toEqual([String(model.baseline.coverage.counts[state]), String(model.current.coverage.counts[state])]);
    }
    const uncertainty = screen.getByRole("region", { name: "Uncertainty & intentional exclusions" });
    expect(within(uncertainty).getByRole("row", { name: /northstar-demo-archive.*Access denied/ })).toBeInTheDocument();
    expect(within(uncertainty).getByRole("row", { name: /northstar-demo-public-assets.*Partial evidence/ })).toBeInTheDocument();
    expect(within(uncertainty).getByRole("row", { name: /northstar-demo-logs.*Not evaluated/ })).toBeInTheDocument();
    expect(container.querySelectorAll('[data-status="RESOLVED"]')).toHaveLength(1);
    expect(container.querySelectorAll('[data-status="IN_PROGRESS"]')).toHaveLength(1);
    expect(container.querySelectorAll('[data-status="PARTIAL_EVIDENCE"]')).toHaveLength(1);
    expect(container.querySelector("header")?.textContent).toContain("DEMO DATA");
    expect(container.querySelector("footer")?.textContent).toContain("DEMO DATA · SYNTHETIC ENVIRONMENT · NOT CUSTOMER DATA");
  });

  it("keeps the executive brief concise and ordered by the action projection", () => {
    const { container } = render(<ReportView model={model} kind="executive" language="en" />);
    expect(screen.getByRole("heading", { name: "Decisions & accountable actions" })).toBeInTheDocument();
    expect(container.querySelector(".report-item")?.getAttribute("aria-label")).toBe(`${model.actions[0].finding.ruleId} ${model.actions[0].finding.resourceId}`);
    expect(container.querySelector("pre")).toBeNull();
    expect(screen.queryByRole("heading", { name: "Normalized evidence inventory" })).not.toBeInTheDocument();
  });

  it("provides exact bound evidence and evaluated timestamps in the technical appendix", () => {
    render(<ReportView model={model} kind="technical" language="en" />);
    const detail = model.details.find((item) => item.finding.resourceId === "sg-demo-admin")!;
    const record = screen.getByRole("region", { name: "SG-001 sg-demo-admin" });
    for (const evaluation of [detail.baselineEvaluation!, detail.currentEvaluation!]) {
      expect(record.textContent).toContain(evaluation.evaluationId);
      expect(record.textContent).toContain(evaluation.evaluatedAt);
      for (const binding of evaluation.evidenceBindings) {
        const evidenceBlock = within(record).getByText(binding.evidenceId).closest(".report-evidence")!;
        expect(evidenceBlock.textContent).toContain(binding.sourceId);
      }
    }
    expect(screen.getByRole("heading", { name: "Applicable control comparison" })).toBeInTheDocument();
    expect(within(record).getByRole("heading", { name: "Severity rationale" })).toBeInTheDocument();
    expect(within(record).getByRole("heading", { name: "Confidence rationale" })).toBeInTheDocument();
    expect(within(record).queryByRole("heading", { name: "Evidence timeline" })).not.toBeInTheDocument();
  });

  it("packages all normalized observations, source/importer versions and rules, including denied evidence", () => {
    const { container } = render(<ReportView model={model} kind="package" language="en" />);
    expect(screen.getByRole("heading", { name: "Security questions & supporting conclusions" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Source collection & importer ledger" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Versioned control register" })).toBeInTheDocument();
    const inventory = screen.getByRole("heading", { name: "Normalized evidence inventory" }).closest("section")!;
    expect(inventory.querySelectorAll(".report-proof")).toHaveLength(model.baseline.evidence.length + model.current.evidence.length);
    for (const snapshot of [model.baseline, model.current]) {
      for (const evidence of snapshot.evidence) expect(inventory.textContent).toContain(evidence.evidenceId);
      for (const source of snapshot.sourceManifest) expect(container.textContent).toContain(`${source.sourceVersion} / ${source.importerVersion}`);
    }
    expect(within(inventory).getAllByRole("region", { name: /northstar-demo-archive/ })).toHaveLength(2);
  });

  it("keeps recheck control outcomes separate from remediation, including passing non-findings", () => {
    render(<ReportView model={model} kind="recheck" language="en" />);
    const comparison = screen.getByRole("region", { name: "Applicable control comparison" });
    expect(within(comparison).getByRole("row", { name: /northstar-demo-logs S3-001 v1.2.0 Pass Pass/ })).toBeInTheDocument();
    expect(within(comparison).getByRole("row", { name: /sg-demo-admin SG-001 v1.2.0 Fail Pass/ })).toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: "S3-001 northstar-demo-public-assets" })).getByText("Unable to verify")).toBeInTheDocument();
    const admin = screen.getByRole("region", { name: "SG-001 sg-demo-admin" });
    expect(within(admin).getByRole("heading", { name: "Evidence timeline" })).toBeInTheDocument();
    expect(admin.querySelector(".report-decision p")).toHaveTextContent("Open → Resolved");
  });

  it("renders technical payloads as inert text and retains technical direction in Arabic", () => {
    const hostile = "<script>window.pwned=true</script><img src=x onerror=alert(1)>";
    const altered = structuredClone(model);
    altered.details[0].action.owner = hostile;
    const { container } = render(<ReportView model={altered} kind="package" language="ar" />);
    expect(container.textContent).toContain(hostile);
    expect(container.querySelector("script,img")).toBeNull();
    expect(screen.getByRole("heading", { name: "سجل الأدلة الموحّدة" })).toBeInTheDocument();
    expect(container.querySelectorAll("pre").length).toBeGreaterThan(0);
    for (const pre of container.querySelectorAll("pre")) expect(pre.dir).toBe("ltr");
  });

  it("reports a newly detected resource without fabricating a baseline failure", () => {
    const observedAt = "2026-09-10T00:00:00.000Z";
    const admin = directObservations.find((observation) => observation.resource.id === "sg-demo-admin")!;
    const source = directAwsSource(model.current.assessment.assessmentId, [
      ...directObservations.map((observation) => ({ ...observation, observedAt })),
      { ...admin, observationId: "new-review-resource", observedAt, resource: { ...admin.resource, id: "sg-demo-new", name: "Synthetic new resource" } },
    ], observedAt);
    const result = runEvidencePipeline({ ...model.current.assessment, evidenceSourceIds: [source.sourceId] }, [source],
      { generatedAt: model.current.generatedAt, excludedChecks: [{ ruleId: "S3-002", resourceId: "northstar-demo-logs" }] }, syntheticAdapters);
    expect(result.success).toBe(true);
    if (!result.success) return;
    const workflow = projectWorkflow(model.baseline, result.projection, []);
    render(<ReportView model={workflow} kind="recheck" language="en" />);
    const record = screen.getByRole("region", { name: "SG-001 sg-demo-new" });
    expect(within(record).getAllByText("Not in baseline").length).toBeGreaterThan(0);
    expect(within(record).getByText("New finding")).toBeInTheDocument();
    expect(record.querySelectorAll('[data-status="FAIL"]')).toHaveLength(1);
    expect(record.querySelectorAll('[data-status="UNKNOWN"]')).toHaveLength(0);
  });
});
