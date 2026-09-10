import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { ProductConsole } from "./product-console";
import { ReportView } from "./report-view";
import { buildProductDemo } from "../demo/product-demo";
import { runEvidencePipeline } from "../application/evidence-pipeline";
import { projectWorkflow } from "../application/prototype-workflow";
import { directAwsSource, directObservations } from "../demo/fixtures/direct-aws";
import { syntheticAdapters } from "../demo/evidence-prototype";
const model = buildProductDemo();
beforeEach(() => { vi.spyOn(window, "scrollTo").mockImplementation(() => {}); });
afterEach(() => { cleanup(); localStorage.clear(); });

describe("product interactions", () => {
  it("keeps new failures in the Action Plan and separates verified outcomes from remaining work", () => {
    const { container, rerender } = render(<ProductConsole model={model} />);
    fireEvent.click(within(screen.getByRole("navigation")).getByRole("button", { name: "Action Plan" }));
    expect(container.querySelectorAll(".action-row")).toHaveLength(5);
    expect(container.querySelector(".action-list")?.textContent).not.toContain("sg-demo-admin");
    expect(container.querySelector(".completed-actions")?.textContent).toContain("sg-demo-admin");
    expect(container.querySelector('.completed-actions [data-status="RESOLVED"]')).not.toBeNull();
    const observedAt = "2026-09-10T00:00:00.000Z";
    const admin = directObservations.find((observation) => observation.resource.id === "sg-demo-admin")!;
    const source = directAwsSource(model.current.assessment.assessmentId, [
      ...directObservations.map((observation) => ({ ...observation, observedAt })),
      { ...admin, observationId: "new-action-resource", observedAt, resource: { ...admin.resource, id: "sg-demo-new", name: "Synthetic new resource" } },
    ], observedAt);
    const result = runEvidencePipeline({ ...model.current.assessment, evidenceSourceIds: [source.sourceId] }, [source],
      { generatedAt: model.current.generatedAt, excludedChecks: [{ ruleId: "S3-002", resourceId: "northstar-demo-logs" }] }, syntheticAdapters);
    expect(result.success).toBe(true);
    if (!result.success) return;
    rerender(<ProductConsole model={projectWorkflow(model.baseline, result.projection, [])} />);
    const newAction = [...container.querySelectorAll(".action-row")].find((row) => row.textContent?.includes("sg-demo-new"))!;
    expect(newAction).toBeDefined(); expect(newAction.textContent).toContain("Engineering");
    expect(newAction.querySelector('[data-status="OPEN"]')).not.toBeNull();
    fireEvent.click(within(newAction as HTMLElement).getByRole("button"));
    expect(container.querySelector('.decision-panel [data-status="NO_BASELINE"]')).not.toBeNull();
    expect(container.querySelector('.decision-panel [data-status="FAIL"]')).not.toBeNull();
    expect(screen.getAllByText("Newly detected").length).toBeGreaterThan(0);
  });

  it("filters evidence without losing provenance and distinguishes snapshot observation times", () => {
    const { container } = render(<ProductConsole model={model} />);
    fireEvent.click(within(screen.getByRole("navigation")).getByRole("button", { name: "Evidence" }));
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "sg-demo-admin" } });
    fireEvent.change(screen.getByLabelText("Source", { exact: true }), { target: { value: "northstar-security-hub" } });
    const inspector = container.querySelector(".evidence-inspector")!;
    expect(inspector.textContent).toContain("2026-09-09");
    expect(inspector.textContent).toContain("0.0.0.0/0");
    expect(inspector.textContent).toContain("northstar-security-hub");
    fireEvent.click(screen.getByRole("button", { name: "Current evidence" }));
    expect(screen.getByLabelText("Source", { exact: true })).toHaveValue("all");
    expect(inspector.textContent).toContain("2026-09-10");
    expect(inspector.textContent).toContain("10.0.0.0/8");
    expect(inspector.textContent).toContain("northstar-direct");
    expect(inspector.querySelector('[data-status="PASS"]')).not.toBeNull();
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "no-matching-observation" } });
    expect(container.querySelectorAll(".evidence-index tbody tr")).toHaveLength(0);
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(container.querySelectorAll(".evidence-index tbody tr")).toHaveLength(model.current.evidence.length);
  });

  it("filters findings and exposes an accessible empty state", () => {
    render(<ProductConsole model={model} />);
    fireEvent.click(within(screen.getByRole("navigation")).getByRole("button", { name: /Findings/ }));
    const search = screen.getByRole("searchbox");
    fireEvent.change(search, { target: { value: "sg-demo-admin" } });
    expect(screen.getAllByRole("row")).toHaveLength(2);
    fireEvent.change(search, { target: { value: "nothing-matches" } });
    expect(screen.getByText("No findings match these filters.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(screen.getAllByRole("row")).toHaveLength(7);
    expect(screen.getAllByRole("cell", { name: "1 source" })).toHaveLength(5);
    expect(screen.getByRole("cell", { name: "3 sources" })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Language"), { target: { value: "ar" } });
    expect(screen.getAllByRole("cell", { name: "مصدر واحد" })).toHaveLength(5);
    expect(screen.getByRole("cell", { name: "3 مصادر" })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Language"), { target: { value: "en" } });
  });
  it("switches language and theme without duplicating pages", () => {
    render(<ProductConsole model={model} />);
    fireEvent.change(screen.getByLabelText("Language"), { target: { value: "ar" } });
    expect(document.documentElement.dir).toBe("rtl"); expect(document.documentElement.lang).toBe("ar");
    expect(screen.getByRole("heading", { level: 1, name: "التقييم" })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("المظهر"), { target: { value: "dark" } });
    expect(document.documentElement.dataset.theme).toBe("dark");
    fireEvent.change(screen.getByLabelText("المظهر"), { target: { value: "light" } });
    expect(document.documentElement.dataset.theme).toBe("light");
    fireEvent.change(screen.getByLabelText("المظهر"), { target: { value: "system" } });
    expect(document.documentElement.dataset.theme).toBe("system");
    fireEvent.change(screen.getByLabelText("Language"), { target: { value: "en" } });
    expect(document.documentElement.dir).toBe("ltr");
  });
  it("shows evidence, separate rationale, provenance and timeline in finding detail", () => {
    render(<ProductConsole model={model} />);
    fireEvent.click(screen.getByRole("button", { name: /sg-demo-admin/ }));
    expect(screen.getByRole("heading", { name: "Evidence timeline" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Confidence rationale" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Severity rationale" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "AERQON operational enrichment" })).toBeInTheDocument();
    expect(screen.getByText("Exact provenance")).toBeInTheDocument();
  });
  it("renders hostile data as inert text in reports", () => {
    const hostile = "<script>window.pwned=true</script><img src=x onerror=alert(1)>";
    const copy = structuredClone(model); copy.details[0].action.owner = hostile;
    const { container } = render(<ReportView model={copy} kind="package" language="en" />);
    expect(container.textContent).toContain(hostile); expect(container.querySelector("script,img")).toBeNull();
    expect(container.textContent).toContain("NOT CUSTOMER DATA");
    expect(container.textContent).toContain("Limitations & remaining unknowns");
  });
  it.each(["executive", "technical", "package", "recheck"] as const)("%s report preserves classifications and verified outcomes", (kind) => {
    const { container } = render(<ReportView model={model} kind={kind} language="ar" />);
    expect(container.textContent).toContain("DEMO DATA");
    expect(container.querySelectorAll('[data-status="RESOLVED"]')).toHaveLength(1);
    expect(container.querySelectorAll('[data-status="IN_PROGRESS"]')).toHaveLength(1);
    expect(container.querySelectorAll('[data-status="PARTIAL_EVIDENCE"]')).toHaveLength(1);
  });
});
